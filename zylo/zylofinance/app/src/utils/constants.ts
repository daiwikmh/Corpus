export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 114);

export const IS_TESTNET = CHAIN_ID === 114;

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ??
  (IS_TESTNET
    ? 'https://coston2-api.flare.network/ext/C/rpc'
    : 'https://flare-api.flare.network/ext/C/rpc');

export const EXPLORER_URL = IS_TESTNET
  ? 'https://coston2-explorer.flare.network'
  : 'https://flare-explorer.flare.network';

export const NATIVE_SYMBOL = IS_TESTNET ? 'C2FLR' : 'FLR';

export const ARKA_BASE_URL = 'https://arka.etherspot.io';

export const getPaymasterUrl = () => {
  const apiKey = process.env.NEXT_PUBLIC_ETHERSPOT_API_KEY;
  return `${ARKA_BASE_URL}?apiKey=${apiKey}&chainId=${CHAIN_ID}&useVp=true`;
};

export const TIMEOUTS = {
  USER_OP_RECEIPT: 90_000,
  POLLING_INTERVAL: 2_000,
  FDC_ROUND: 600_000,
  FDC_POLL_INTERVAL: 8_000,
} as const;

export const TX_STATUS = {
  IDLE: 'idle',
  PENDING: 'pending',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

export type TxStatus = (typeof TX_STATUS)[keyof typeof TX_STATUS];

export const DECIMAL_PLACES = {
  BALANCE: 4,
  APY: 1,
} as const;

export const EXTERNAL_LINKS = {
  COSTON2_FAUCET: 'https://faucet.flare.network/coston2',
  XRP_TESTNET_FAUCET: 'https://test.bithomp.com/faucet/',
  EXPLORER: EXPLORER_URL,
} as const;

/** XRPL drops per XRP, and the FAsset UBA scale for FXRP. */
export const DROPS_PER_XRP = 1_000_000;

export const explorerTx = (hash: string) => `${EXPLORER_URL}/tx/${hash}`;
export const explorerAddress = (address: string) => `${EXPLORER_URL}/address/${address}`;
export const xrplExplorerTx = (hash: string) =>
  IS_TESTNET ? `https://testnet.xrpl.org/transactions/${hash}` : `https://xrpl.org/transactions/${hash}`;
