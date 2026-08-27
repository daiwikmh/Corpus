"use client";

import { useCallback } from 'react';
import { useWalletClient } from 'wagmi';
import { useSmartAccount } from '../providers/smart-account';
import { publicClient } from '../contracts/client';
import { sendBatch, waitForUserOpReceipt, type Call, type UserOpReceipt } from '../utils/etherspot';

export interface TxResult {
  hash: string;
  receipt: UserOpReceipt;
}

export type TxSender = (calls: Call[]) => Promise<TxResult>;

/**
 * One call signature for both account modes. With Etherspot configured the
 * calls go out as a single sponsored UserOperation; otherwise the connected
 * wallet sends them itself and pays its own gas.
 */
export function useTxSender(): { send: TxSender; sponsored: boolean } {
  const { primeSdk, mode } = useSmartAccount();
  const { data: walletClient } = useWalletClient();

  const send = useCallback<TxSender>(
    async (calls) => {
      if (!calls.length) throw new Error('Nothing to send');

      if (primeSdk) {
        const hash = await sendBatch(primeSdk, calls);
        return { hash, receipt: await waitForUserOpReceipt(primeSdk, hash) };
      }

      if (!walletClient) {
        throw new Error('No wallet connected. Connect a wallet to continue.');
      }

      // Wallets cannot batch, so the calls go one after another and the last
      // receipt is the one callers inspect for events.
      let result: TxResult | null = null;

      for (const call of calls) {
        const hash = await walletClient.sendTransaction({
          to: call.to,
          data: call.data,
          value: call.value,
        });

        const receipt = await publicClient().waitForTransactionReceipt({ hash });

        result = {
          hash,
          receipt: {
            success: receipt.status === 'success',
            logs: receipt.logs as UserOpReceipt['logs'],
          },
        };

        if (!result.receipt.success) return result;
      }

      return result!;
    },
    [primeSdk, walletClient],
  );

  return { send, sponsored: mode === 'smart-account' };
}
