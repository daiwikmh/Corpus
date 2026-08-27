"use client";

import { ReactNode } from 'react';
import { useAccount } from 'wagmi';
import { LoginScreen } from './LoginScreen';

export const AuthGuard = ({ children }: { children: ReactNode }) => {
  const { isConnected } = useAccount();

  if (!isConnected) return <LoginScreen />;

  return <>{children}</>;
};
