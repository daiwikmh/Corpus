import { NextResponse } from 'next/server';

/**
 * Asks the FDC verifier to encode a `Payment` attestation request for an XRPL
 * transaction. The verifier API key is a server secret, so this never runs in
 * the browser — the client only ever sees the resulting abiEncodedRequest.
 */
export async function POST(request: Request) {
  try {
    const { transactionId, inUtxo = '0', utxo = '0' } = await request.json();

    if (typeof transactionId !== 'string' || !/^[0-9a-fA-F]{64}$/.test(transactionId)) {
      return NextResponse.json(
        { error: 'transactionId must be a 64-character XRPL transaction hash' },
        { status: 400 },
      );
    }

    const verifierUrl = process.env.FDC_VERIFIER_URL;
    const verifierApiKey = process.env.FDC_VERIFIER_API_KEY;

    if (!verifierUrl || !verifierApiKey) {
      return NextResponse.json(
        { error: 'FDC verifier is not configured. Set FDC_VERIFIER_URL and FDC_VERIFIER_API_KEY.' },
        { status: 500 },
      );
    }

    const sourceId = process.env.FDC_SOURCE_ID || 'testXRP';

    const response = await fetch(
      `${verifierUrl.replace(/\/$/, '')}/verifier/xrp/Payment/prepareRequest`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': verifierApiKey,
        },
        body: JSON.stringify({
          attestationType: toPaddedHex('Payment'),
          sourceId: toPaddedHex(sourceId),
          requestBody: {
            transactionId: `0x${transactionId.toUpperCase()}`,
            inUtxo: String(inUtxo),
            utxo: String(utxo),
          },
        }),
      },
    );

    const body = await response.json();

    if (!response.ok || body.status !== 'VALID' || !body.abiEncodedRequest) {
      return NextResponse.json(
        {
          error: 'Verifier could not attest this payment yet',
          status: body?.status ?? response.status,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ abiEncodedRequest: body.abiEncodedRequest });
  } catch (error) {
    console.error('FDC prepare failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to prepare attestation request' },
      { status: 500 },
    );
  }
}

/** FDC identifiers are utf8 right-padded to 32 bytes. */
function toPaddedHex(value: string): string {
  const hex = Buffer.from(value, 'utf8').toString('hex');
  return `0x${hex.padEnd(64, '0')}`;
}
