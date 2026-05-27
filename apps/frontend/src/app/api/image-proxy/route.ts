import { NextRequest, NextResponse } from 'next/server';
import https from 'node:https';
import { IncomingMessage } from 'node:http';
import { lookup } from 'dns/promises';

// Domains always allowed (mirrors next.config.js remotePatterns)
const BUILTIN_DOMAINS = new Set([
  'res.cloudinary.com',
  'static.truyenfull.vision',
  'cache.staticscdn.net',
  'iads.staticscdn.net',
  'images.unsplash.com',
  'lh3.googleusercontent.com',
  'gtvseo.com',
  'ui-avatars.com',
  'i.pinimg.com',
]);

const BLOCKED_HOSTNAME_RE =
  /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|::1|0\.0\.0\.0|fd[0-9a-f]{2}:)/i;

const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 10_000;
const MAX_BODY_BYTES = 10 * 1024 * 1024; // 10 MB

const UPSTREAM_HEADERS = {
  Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
  'User-Agent': 'Mozilla/5.0 (compatible; NextImageProxy/1.0)',
};

function isBlockedIp(ip: string): boolean {
  // IPv4-mapped IPv6 — unwrap and recurse
  const v4mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (v4mapped) return isBlockedIp(v4mapped[1]);

  const v4 = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const [a, b, c] = [+v4[1], +v4[2], +v4[3]];
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||   // CGNAT 100.64.0.0/10
      (a === 169 && b === 254) ||              // link-local
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && b === 51 && c === 100) ||  // TEST-NET-2
      (a === 203 && b === 0 && c === 113)      // TEST-NET-3
    );
  }
  const lc = ip.toLowerCase();
  return lc === '::1' || lc.startsWith('fe80:') || lc.startsWith('fc') || lc.startsWith('fd');
}

/**
 * Resolve ALL addresses for hostname and reject if ANY is a blocked IP.
 * Returns the first safe address to use as the pinned connection target.
 * This defeats DNS rebinding: same resolution used for both validation and connection.
 */
async function resolveAndPin(hostname: string): Promise<string> {
  if (BLOCKED_HOSTNAME_RE.test(hostname)) throw new Error('blocked_hostname');

  let addresses: { address: string; family: number }[];
  try {
    addresses = await lookup(hostname, { all: true });
  } catch {
    throw new Error('dns_failed');
  }
  if (addresses.length === 0) throw new Error('dns_failed');

  for (const { address } of addresses) {
    if (isBlockedIp(address)) throw new Error('blocked_ip');
  }
  return addresses[0].address;
}

interface UpstreamResult {
  status: number;
  contentType?: string;
  location?: string;
  body?: Buffer;
}

/**
 * Single HTTPS request to a pre-resolved IP.
 * - host = resolved IP (no further DNS lookup by Node TLS stack)
 * - servername = original hostname (SNI, for cert validation)
 * - Host header = original hostname (for virtual hosting)
 * Eliminates the TOCTOU gap between dns.lookup() and fetch().
 */
function httpsRequest(targetUrl: URL, resolvedIp: string, timeoutMs: number): Promise<UpstreamResult> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      req.destroy();
      reject(Object.assign(new Error('Upstream timeout'), { name: 'TimeoutError' }));
    }, timeoutMs);

    const req = https.request(
      {
        host: resolvedIp,        // connect to validated IP directly — no second DNS lookup
        port: 443,
        path: targetUrl.pathname + targetUrl.search,
        method: 'GET',
        servername: targetUrl.hostname,   // SNI — TLS cert validated against original hostname
        headers: { ...UPSTREAM_HEADERS, host: targetUrl.hostname },
        rejectUnauthorized: true,
      },
      (res: IncomingMessage) => {
        clearTimeout(timer);
        const status = res.statusCode ?? 0;

        // Redirect — return Location without buffering body
        if (status >= 300 && status < 400) {
          res.resume();
          return resolve({ status, location: Array.isArray(res.headers.location) ? res.headers.location[0] : res.headers.location });
        }

        const chunks: Buffer[] = [];
        let total = 0;
        res.on('data', (chunk: Buffer) => {
          total += chunk.length;
          if (total > MAX_BODY_BYTES) {
            res.destroy();
            return reject(new Error('response_too_large'));
          }
          chunks.push(chunk);
        });
        res.on('end', () =>
          resolve({
            status,
            contentType: Array.isArray(res.headers['content-type'])
              ? res.headers['content-type'][0]
              : res.headers['content-type'],
            body: Buffer.concat(chunks),
          }),
        );
        res.on('error', reject);
      },
    );

    req.on('error', (err) => { clearTimeout(timer); reject(err); });
    req.end();
  });
}

async function getAllowedDomains(): Promise<Set<string>> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const res = await fetch(`${apiUrl}/api/settings`, { next: { revalidate: 60 } });
    if (!res.ok) return new Set();
    const json = await res.json();
    const domains: string[] = json?.data?.allowedImageDomains ?? json?.allowedImageDomains ?? [];
    return new Set(domains);
  } catch {
    return new Set();
  }
}

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get('url');
  if (!urlParam) return new NextResponse('Missing url param', { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(urlParam);
  } catch {
    return new NextResponse('Invalid url', { status: 400 });
  }

  if (parsed.protocol !== 'https:') return new NextResponse('Only HTTPS allowed', { status: 400 });

  // Allowlist check on initial hostname
  const hostname = parsed.hostname.toLowerCase();
  const adminDomains = await getAllowedDomains();
  if (!BUILTIN_DOMAINS.has(hostname) && !adminDomains.has(hostname)) {
    return new NextResponse('Domain not in allowlist', { status: 403 });
  }

  try {
    let currentUrl = parsed;
    const deadline = Date.now() + TIMEOUT_MS;

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      // Resolve + validate ALL IPs; pin to first safe address
      const resolvedIp = await resolveAndPin(currentUrl.hostname.toLowerCase());

      const remaining = deadline - Date.now();
      if (remaining <= 0) return new NextResponse('Upstream timeout', { status: 504 });

      const result = await httpsRequest(currentUrl, resolvedIp, remaining);

      if (result.status >= 300 && result.status < 400) {
        if (!result.location) return new NextResponse('Redirect with no Location', { status: 502 });
        const redirectUrl = new URL(result.location, currentUrl.toString());
        if (redirectUrl.protocol !== 'https:') return new NextResponse('Redirect to non-HTTPS', { status: 403 });
        // Redirect destinations only need DNS/IP validation (allowlist applies to initial URL only)
        currentUrl = redirectUrl;
        continue;
      }

      if (result.status < 200 || result.status >= 300) {
        return new NextResponse('Upstream error', { status: result.status });
      }

      const contentType = result.contentType ?? 'image/jpeg';
      if (!contentType.startsWith('image/')) return new NextResponse('Not an image', { status: 415 });

      return new NextResponse(result.body, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    return new NextResponse('Too many redirects', { status: 502 });
  } catch (err: any) {
    if (err?.name === 'TimeoutError') return new NextResponse('Upstream timeout', { status: 504 });
    if (['blocked_hostname', 'blocked_ip', 'dns_failed'].includes(err?.message)) {
      return new NextResponse('Domain not allowed', { status: 403 });
    }
    if (err?.message === 'response_too_large') return new NextResponse('Response too large', { status: 502 });
    return new NextResponse('Fetch error', { status: 502 });
  }
}
