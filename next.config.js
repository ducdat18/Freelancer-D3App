/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable SWC minification to avoid issues with Solana libraries
  swcMinify: false,

  webpack: (config, { isServer }) => {
    // Fixes npm packages that depend on `fs` module
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        url: require.resolve('url'),
        zlib: require.resolve('browserify-zlib'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        assert: require.resolve('assert'),
        os: require.resolve('os-browserify/browser'),
        path: require.resolve('path-browserify'),
      };
    }

    // Dedupe @solana/web3.js to prevent multiple instances
    config.resolve.alias = {
      ...config.resolve.alias,
      '@solana/web3.js': require.resolve('@solana/web3.js'),
    };

    return config;
  },

  // Transpile Solana packages
  transpilePackages: [
    '@solana/wallet-adapter-base',
    '@solana/wallet-adapter-react',
    '@solana/wallet-adapter-react-ui',
    '@solana/wallet-adapter-wallets',
  ],
};

module.exports = nextConfig;
