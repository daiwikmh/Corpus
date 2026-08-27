import { EXPLORER_URL, explorerTx } from '../utils/constants';

interface ExplorerTx {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  txreceipt_status: string;
  functionName?: string;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  status: 'success' | 'failed';
  method?: string;
}

export async function fetchTransactionHistory(
  address: string,
  limit = 10,
): Promise<Transaction[]> {
  try {
    const url = `${EXPLORER_URL}/api?module=account&action=txlist&address=${address}&sort=desc&page=1&offset=${limit}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== '1' || !Array.isArray(data.result)) return [];

    return (data.result as ExplorerTx[]).slice(0, limit).map((tx) => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: (Number(tx.value) / 1e18).toFixed(6),
      timestamp: Number(tx.timeStamp),
      status: tx.txreceipt_status === '1' ? 'success' : 'failed',
      method: tx.functionName?.split('(')[0] || undefined,
    }));
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    return [];
  }
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const getTransactionExplorerLink = explorerTx;
