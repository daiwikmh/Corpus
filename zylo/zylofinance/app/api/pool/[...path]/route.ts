import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxies the browser to the enclave.
 *
 * Keeping the enclave URL server-side means the CVM is not addressable from
 * the public internet just because someone loaded the app. Session headers are
 * forwarded untouched — the enclave, not this route, is what authenticates
 * them, so the proxy is never in a position to mint access.
 */
const ENCLAVE_URL = process.env.ENCLAVE_URL || 'http://127.0.0.1:8088';

const FORWARDED = [
  'x-zylo-account',
  'x-zylo-issued-at',
  'x-zylo-ttl',
  'x-zylo-signature',
  'content-type',
];

async function forward(request: NextRequest, path: string[]) {
  const target = `${ENCLAVE_URL}/${path.join('/')}`;

  const headers = new Headers();
  for (const key of FORWARDED) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }

  try {
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === 'GET' ? undefined : await request.text(),
      cache: 'no-store',
    });

    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return NextResponse.json(
      { error: 'The enclave is not reachable. Is the dark pool runtime running?' },
      { status: 503 },
    );
  }
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return forward(request, path);
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return forward(request, path);
}
