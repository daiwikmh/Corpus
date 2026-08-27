export interface XamanPaymentPayload {
  agentUnderlyingAddress: string;
  totalAmountXRP: number;
  paymentReference: string;
}

export interface XamanPayloadResult {
  uuid: string;
  qrUrl: string;
  deepLink: string;
}

export interface XamanStatus {
  resolved: boolean;
  signed: boolean;
  cancelled: boolean;
  expired: boolean;
  txid: string | null;
  account: string | null;
}

export async function createXamanPayload(
  payload: XamanPaymentPayload,
): Promise<XamanPayloadResult> {
  const response = await fetch('/api/xaman/payload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Could not create the Xaman request');

  return body as XamanPayloadResult;
}

export async function fetchXamanStatus(uuid: string): Promise<XamanStatus | null> {
  try {
    const response = await fetch(`/api/xaman/status/${uuid}`);
    if (!response.ok) return null;
    return (await response.json()) as XamanStatus;
  } catch {
    return null;
  }
}
