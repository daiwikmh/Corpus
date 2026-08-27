import { NextResponse } from 'next/server';
import { XummSdk } from 'xumm-sdk';

/**
 * Creates a Xaman sign request for the XRP leg of a mint. This returns as soon
 * as the payload exists — it deliberately does not wait for the user to sign,
 * which would hold the request open past any serverless timeout. The client
 * polls /api/xaman/status/[uuid] instead.
 */
export async function POST(request: Request) {
  try {
    const { agentUnderlyingAddress, totalAmountXRP, paymentReference } = await request.json();

    if (!agentUnderlyingAddress || !totalAmountXRP || !paymentReference) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const apiKey = process.env.XUMM_API_KEY;
    const apiSecret = process.env.XUMM_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'Xaman is not configured. Set XUMM_API_KEY and XUMM_API_SECRET.' },
        { status: 500 },
      );
    }

    const sdk = new XummSdk(apiKey, apiSecret);

    const amountInDrops = String(Math.round(Number(totalAmountXRP) * 1_000_000));
    const memoData = String(paymentReference)
      .replace(/^0x/, '')
      .replace(/0+$/, '')
      .toUpperCase();

    const created = await sdk.payload.create({
      txjson: {
        TransactionType: 'Payment',
        Destination: agentUnderlyingAddress,
        Amount: amountInDrops,
        Memos: [{ Memo: { MemoData: memoData } }],
      },
    });

    if (!created) throw new Error('Xaman did not return a payload');

    return NextResponse.json({
      uuid: created.uuid,
      qrUrl: created.refs?.qr_png ?? '',
      deepLink: created.next?.always ?? '',
    });
  } catch (error) {
    console.error('Xaman payload creation failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create Xaman payload' },
      { status: 500 },
    );
  }
}
