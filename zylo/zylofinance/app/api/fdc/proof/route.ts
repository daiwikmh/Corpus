import { NextResponse } from 'next/server';

/**
 * Pulls a finalised Merkle proof for an attestation request out of the DA layer.
 * Returns 404 while the voting round is still open so the client can keep polling.
 */
export async function POST(request: Request) {
  try {
    const { votingRoundId, requestBytes } = await request.json();

    if (!Number.isInteger(votingRoundId) || typeof requestBytes !== 'string') {
      return NextResponse.json(
        { error: 'votingRoundId (number) and requestBytes (hex string) are required' },
        { status: 400 },
      );
    }

    const daLayerUrl = process.env.FDC_DA_LAYER_URL;
    if (!daLayerUrl) {
      return NextResponse.json(
        { error: 'FDC DA layer is not configured. Set FDC_DA_LAYER_URL.' },
        { status: 500 },
      );
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (process.env.FDC_DA_LAYER_API_KEY) {
      headers['X-API-KEY'] = process.env.FDC_DA_LAYER_API_KEY;
    }

    const response = await fetch(
      `${daLayerUrl.replace(/\/$/, '')}/api/v1/fdc/proof-by-request-round-raw`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ votingRoundId, requestBytes }),
      },
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Proof not available yet', pending: true }, { status: 404 });
    }

    const body = await response.json();

    if (!body?.response_hex || !Array.isArray(body?.proof)) {
      return NextResponse.json({ error: 'Proof not available yet', pending: true }, { status: 404 });
    }

    return NextResponse.json({ responseHex: body.response_hex, proof: body.proof });
  } catch (error) {
    console.error('FDC proof fetch failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch attestation proof' },
      { status: 500 },
    );
  }
}
