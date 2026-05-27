import { NextRequest, NextResponse } from 'next/server';
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

// String-level check for obviously blocked hostnames
const BLOCKED_HOSTNAME_RE =
  /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|::1|0\.0\.0\.0|fd[0-9a-f]{2}:)/i;

const MAX_REDIRECTS = 3;

/** Returns true if an IPv4/IPv6 address is loopback, RFC1918, link-local, or otherwise non-routable. */
function isBlockedIp(ip: string): boolean {
  // IPv4-mapped IPv6 (::ffff:192.168.x.x) — unwrap and recurse
  const v4mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (v4mapped) return isBlockedIp(v4mapped[1]);

  const v4 = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const [a, b, c] = [+v4[1], +v4[2], +v4[3]];
    return (
      a === 0 ||                                           // 0.0.0.0/8
      a === 10 ||                                          // RFC1918 10.0.0.0/8
      a === 127 ||                                         // loopback 127.0.0.0/8
      (a === 100 && b >= 64 && b <= 127) ||                // CGNAT 100.64.0.0/10
      (a === 169 && b === 254) ||                          // link-local
      (a === 172 && b >= 16 && b <= 31) ||                 // RFC1918 172.16.0.0/12
      (a === 192 && b === 168) ||                          // RFC1918 192.168.0.0/16
      (a === 198 && b === 51 && c === 100) ||              // TEST-NET-2
      (a === 203 && b === 0 && c === 113)                  // TEST-NET-3
    );
  }

  const lc = ip.toLowerCase();
  return (
    lc === '::1' ||              // IPv6 loopback
    lc.startsWith('fe80:') ||   // IPv6 link-local
    lc.startsWith('fc') ||      // IPv6 ULA fc00::/7
    lc.startsWith('fd')
  );
}

/**
 * Validate a hostname:
 * 1. String-level blocklist (fast path for obvious cases).
 * 2. DNS resolution → verify resolved IP is not internal (defeats DNS rebinding).
 * Throws on violation.
 */
async function validateHostname(hostname: string): Promise<void> {
  if (BLOCKED_HOSTNAME_RE.test(hostname)) {
    throw new Error('blocked_hostname');
  }
  let address: string;
  try {
    ({ address } = await lookup(hostname));
  } catch {
    throw new Error('dns_failed');
  }
  if (isBlockedIp(address)) {
    throw new Error('blocked_ip');
  }
}

async function getAllowedDomains(): Promise<Set<string>> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const res = await fetch(`${apiUrl}/api/settings`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return new Set();
    const json = await res.json();
    const domains: string[] = json?.data?.allowedImageDomains ?? json?.allowedImageDomains ?? [];
    return new Set(domains);
  } catch {
    return new Set();
  }
}

const FETCH_HEADERS = {
  Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
  'User-Agent': 'Mozilla/5.0 (compatible; NextImageProxy/1.0)',
};

/**
 * Fetch with manual redirect handling.
 * Each redirect destination is re-validated (hostname string check + DNS IP check)
 * to prevent SSRF via open redirects. Allowlist is only enforced on the initial URL.
 */
async function safeFetch(initialUrl: string): Promise<Response> {
  let currentUrl = initialUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(currentUrl, {
      redirect: 'manual',
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(10_000),
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) throw new Error('redirect_no_location');

      const redirectUrl = new URL(location, currentUrl);
      if (redirectUrl.protocol !== 'https:') throw new Error('redirect_non_https');

      // Re-validate destination — allowlist not required for hops, but IP check is
      await validateHostname(redirectUrl.hostname.toLowerCase());

      currentUrl = redirectUrl.toString();
      continue;
    }

    return res;
  }
  throw new Error('too_many_redirects');
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const url = searchParams.get('url');

  if (!url) {
    return new NextResponse('Missing url param', { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse('Invalid url', { status: 400 });
  }

  if (parsed.protocol !== 'https:') {
    return new NextResponse('Only HTTPS allowed', { status: 400 });
  }

  const hostname = parsed.hostname.toLowerCase();

  // Allowlist check on initial URL
  const adminDomains = await getAllowedDomains();
  if (!BUILTIN_DOMAINS.has(hostname) && !adminDomains.has(hostname)) {
    return new NextResponse('Domain not in allowlist', { status: 403 });
  }

  // DNS validation on initial URL (defeats DNS rebinding on allowlisted domains)
  try {
    await validateHostname(hostname);
  } catch (err: any) {
    return new NextResponse('Domain not allowed', { status: 403 });
  }

  try {
    const upstream = await safeFetch(url);

    if (!upstream.ok) {
      return new NextResponse('Upstream fetch failed', { status: upstream.status });
    }

    const contentType = upstream.headers.get('content-type') ?? 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return new NextResponse('Not an image', { status: 415 });
    }

    const body = await upstream.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: any) {
    if (err?.name === 'TimeoutError') return new NextResponse('Upstream timeout', { status: 504 });
    if (err?.message === 'too_many_redirects') return new NextResponse('Too many redirects', { status: 502 });
    if (err?.message?.startsWith('redirect_') || err?.message?.startsWith('blocked_') || err?.message === 'dns_failed') {
      return new NextResponse('Domain not allowed', { status: 403 });
    }
    return new NextResponse('Fetch error', { status: 502 });
  }
}
