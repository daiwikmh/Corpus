import { formatEther } from 'viem';
import { CONTRACTS } from '../contracts/config';
import { ZYLO_VAULT_ABI } from '../contracts/abis';
import { publicClient, fetchPrices } from '../contracts/client';

export interface VaultAnalytics {
  totalAssets: number;
  totalShares: number;
  totalYield: number;
  sharePrice: number;
  tvlUsd: number;
  flrUsd: number;
}

export interface UserYieldStats {
  userShares: number;
  userAssets: number;
  userYieldEarned: number;
  userPercentageOfPool: number;
}

const EMPTY: VaultAnalytics = {
  totalAssets: 0,
  totalShares: 0,
  totalYield: 0,
  sharePrice: 1,
  tvlUsd: 0,
  flrUsd: 0,
};

export async function fetchVaultAnalytics(): Promise<VaultAnalytics> {
  try {
    const client = publicClient();

    const [totalAssets, totalShares] = (await Promise.all([
      client.readContract({
        address: CONTRACTS.ZYLO_VAULT,
        abi: ZYLO_VAULT_ABI,
        functionName: 'totalAssets',
      }),
      client.readContract({
        address: CONTRACTS.ZYLO_VAULT,
        abi: ZYLO_VAULT_ABI,
        functionName: 'totalSupply',
      }),
    ])) as [bigint, bigint];

    const totalAssetsNum = parseFloat(formatEther(totalAssets));
    const totalSharesNum = parseFloat(formatEther(totalShares));

    // Shares mint 1:1 against FLR, so anything the vault holds above the share
    // supply is delegation reward that has already been compounded in.
    const sharePrice = totalSharesNum > 0 ? totalAssetsNum / totalSharesNum : 1;
    const totalYield = Math.max(0, totalAssetsNum - totalSharesNum);

    let flrUsd = 0;
    try {
      flrUsd = (await fetchPrices()).flrUsd;
    } catch (error) {
      console.error('FTSO price read failed, reporting TVL in FLR only:', error);
    }

    return {
      totalAssets: totalAssetsNum,
      totalShares: totalSharesNum,
      totalYield,
      sharePrice,
      tvlUsd: totalAssetsNum * flrUsd,
      flrUsd,
    };
  } catch (error) {
    console.error('Error fetching vault analytics:', error);
    return EMPTY;
  }
}

export async function fetchUserYieldStats(userAddress: string): Promise<UserYieldStats> {
  try {
    const client = publicClient();

    const [userShares, totalShares] = (await Promise.all([
      client.readContract({
        address: CONTRACTS.ZYLO_VAULT,
        abi: ZYLO_VAULT_ABI,
        functionName: 'balanceOf',
        args: [userAddress as `0x${string}`],
      }),
      client.readContract({
        address: CONTRACTS.ZYLO_VAULT,
        abi: ZYLO_VAULT_ABI,
        functionName: 'totalSupply',
      }),
    ])) as [bigint, bigint];

    const userAssets = (await client.readContract({
      address: CONTRACTS.ZYLO_VAULT,
      abi: ZYLO_VAULT_ABI,
      functionName: 'convertToAssets',
      args: [userShares],
    })) as bigint;

    const userSharesNum = parseFloat(formatEther(userShares));
    const userAssetsNum = parseFloat(formatEther(userAssets));
    const totalSharesNum = parseFloat(formatEther(totalShares));

    return {
      userShares: userSharesNum,
      userAssets: userAssetsNum,
      userYieldEarned: Math.max(0, userAssetsNum - userSharesNum),
      userPercentageOfPool: totalSharesNum > 0 ? (userSharesNum / totalSharesNum) * 100 : 0,
    };
  } catch (error) {
    console.error('Error fetching user yield stats:', error);
    return { userShares: 0, userAssets: 0, userYieldEarned: 0, userPercentageOfPool: 0 };
  }
}

export function formatNumber(num: number, decimals = 2): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatUsd(num: number): string {
  return `$${formatNumber(num, 2)}`;
}
