import type { NextConfig } from "next";

/**
 * Optional x402 payment adapters reached through @coinbase/cdp-sdk, which wagmi's
 * Base connector pulls in. Zylo never uses that path, and the packages are not
 * published as hard dependencies, so they are stubbed out rather than installed.
 */
const UNUSED_OPTIONAL_MODULES = [
  '@x402/core/client',
  '@x402/evm',
  '@x402/evm/exact/client',
  '@x402/evm/upto/client',
  '@x402/svm/exact/client',
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.externals.push('pino-pretty', 'encoding');

    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
      'react-native': false,
      ...Object.fromEntries(UNUSED_OPTIONAL_MODULES.map((name) => [name, false])),
    };

    return config;
  },
};

export default nextConfig;
