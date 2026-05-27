import { NextRequest, NextResponse } from 'next/server';

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

// RFC1918 / loopback / link-local — block to prevent SSRF against internal services
const BLOCKED_HOSTNAME_RE =
  /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|::1|0\.0\.0\.0|fd[0-9a-f]{2}:)/i;

async function getAllowedDomains(): Promise<Set<string>> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const res = await fetch(`${apiUrl}/api/settings`, {
      next: { revalidate: 60 }, // cache 60s
    });
    if (!res.ok) return new Set();
    const json = await res.json();
    const domains: string[] = json?.data?.allowedImageDomains ?? json?.allowedImageDomains ?? [];
    return new Set(domains);
  } catch {
    return new Set();
  }
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

  // Only HTTPS — block HTTP to avoid MitM on fetch + block non-image schemes
  if (parsed.protocol !== 'https:') {
    return new NextResponse('Only HTTPS allowed', { status: 400 });
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block loopback / RFC1918 / link-local
  if (BLOCKED_HOSTNAME_RE.test(hostname)) {
    return new NextResponse('Domain not allowed', { status: 403 });
  }

  // Check allowlist: built-in OR admin-added
  const adminDomains = await getAllowedDomains();
  if (!BUILTIN_DOMAINS.has(hostname) && !adminDomains.has(hostname)) {
    return new NextResponse('Domain not in allowlist', { status: 403 });
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        // Forward a generic browser-like Accept so CDNs serve images
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (compatible; NextImageProxy/1.0)',
      },
      signal: AbortSignal.timeout(10_000),
    });

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
    if (err?.name === 'TimeoutError') {
      return new NextResponse('Upstream timeout', { status: 504 });
    }
    return new NextResponse('Fetch error', { status: 502 });
  }
}
