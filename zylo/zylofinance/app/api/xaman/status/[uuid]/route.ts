import { NextResponse } from 'next/server';
import { XummSdk } from 'xumm-sdk';

/** Polled by the mint flow to learn when the XRP payment has been signed. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const { uuid } = await params;

    const apiKey = process.env.XUMM_API_KEY;
    const apiSecret = process.env.XUMM_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Xaman is not configured' }, { status: 500 });
    }

    const sdk = new XummSdk(apiKey, apiSecret);
    const payload = await sdk.payload.get(uuid);

    if (!payload) {
      return NextResponse.json({ error: 'Unknown payload' }, { status: 404 });
    }

    return NextResponse.json({
      resolved: Boolean(payload.meta?.resolved),
      signed: Boolean(payload.meta?.signed),
      cancelled: Boolean(payload.meta?.cancelled),
      expired: Boolean(payload.meta?.expired),
      txid: payload.response?.txid ?? null,
      account: payload.response?.account ?? null,
    });
  } catch (error) {
    console.error('Xaman status lookup failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to read payload status' },
      { status: 500 },
    );
  }
}
