import { formatEther, formatUnits } from 'viem';
import { CONTRACTS, TOKENS } from '../contracts/config';
import { ERC20_ABI, ZYLO_VAULT_ABI } from '../contracts/abis';
import { publicClient, fetchPrices, fetchFxrpAddress } from '../contracts/client';
import { NATIVE_SYMBOL } from '../utils/constants';

export interface AssetLine {
  symbol: string;
  balance: number;
  priceUsd: number;
  valueUsd: number;
}

export interface AccountBalance {
  type: 'Smart Account' | 'Signer';
  address: string;
  assets: AssetLine[];
  totalUsd: number;
}

export interface PortfolioData {
  accounts: AccountBalance[];
  totalUsd: number;
  fxrpBalance: number;
  xrpUsd: number;
  flrUsd: number;
}

async function readAccount(
  address: string,
  fxrpAddress: `0x${string}`,
  xrpUsd: number,
  flrUsd: number,
): Promise<AccountBalance['assets']> {
  const client = publicClient();

  const [native, fxrpRaw, usdtRaw, yflrRaw] = await Promise.all([
    client.getBalance({ address: address as `0x${string}` }),
    client
      .readContract({
        address: fxrpAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      })
      .catch(() => 0n),
    client
      .readContract({
        address: TOKENS.USDT0.address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      })
      .catch(() => 0n),
    client
      .readContract({
        address: CONTRACTS.ZYLO_VAULT,
        abi: ZYLO_VAULT_ABI,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      })
      .catch(() => 0n),
  ]);

  const yflrAssets =
    (yflrRaw as bigint) > 0n
      ? ((await client
          .readContract({
            address: CONTRACTS.ZYLO_VAULT,
            abi: ZYLO_VAULT_ABI,
            functionName: 'convertToAssets',
            args: [yflrRaw as bigint],
          })
          .catch(() => yflrRaw)) as bigint)
      : 0n;

  const nativeBal = Number(formatEther(native as bigint));
  const fxrpBal = Number(formatUnits(fxrpRaw as bigint, TOKENS.FXRP.decimals));
  const usdtBal = Number(formatUnits(usdtRaw as bigint, TOKENS.USDT0.decimals));
  const yflrBal = Number(formatEther(yflrAssets));

  return [
    { symbol: NATIVE_SYMBOL, balance: nativeBal, priceUsd: flrUsd, valueUsd: nativeBal * flrUsd },
    { symbol: TOKENS.FXRP.symbol, balance: fxrpBal, priceUsd: xrpUsd, valueUsd: fxrpBal * xrpUsd },
    { symbol: 'yFLR', balance: yflrBal, priceUsd: flrUsd, valueUsd: yflrBal * flrUsd },
    { symbol: TOKENS.USDT0.symbol, balance: usdtBal, priceUsd: 1, valueUsd: usdtBal },
  ];
}

export async function fetchPortfolioValue(
  smartAccountAddress?: string,
  signerAddress?: string,
): Promise<PortfolioData> {
  const [{ xrpUsd, flrUsd }, fxrpAddress] = await Promise.all([
    fetchPrices().catch(() => ({ xrpUsd: 0, flrUsd: 0 })),
    fetchFxrpAddress(),
  ]);

  const accounts: AccountBalance[] = [];

  const targets: { type: AccountBalance['type']; address?: string }[] = [
    { type: 'Smart Account', address: smartAccountAddress },
    { type: 'Signer', address: signerAddress },
  ];

  for (const target of targets) {
    if (!target.address) continue;
    const assets = await readAccount(target.address, fxrpAddress, xrpUsd, flrUsd);
    accounts.push({
      type: target.type,
      address: target.address,
      assets,
      totalUsd: assets.reduce((sum, a) => sum + a.valueUsd, 0),
    });
  }

  const fxrpBalance = accounts
    .flatMap((a) => a.assets)
    .filter((a) => a.symbol === TOKENS.FXRP.symbol)
    .reduce((sum, a) => sum + a.balance, 0);

  return {
    accounts,
    totalUsd: accounts.reduce((sum, a) => sum + a.totalUsd, 0),
    fxrpBalance,
    xrpUsd,
    flrUsd,
  };
}
