/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable SWC minification to avoid issues with Solana libraries
  swcMinify: false,

  // `next lint` is wired up (.eslintrc → next/core-web-vitals) so linting can be
  // run manually, but the production build is not blocked by the ~25 pre-existing
  // cosmetic lint errors (unescaped entities, JSX comment nodes). Fix those and
  // then flip this to false to enforce lint at build time.
  eslint: {
    ignoreDuringBuilds: true,
  },

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

  // Security headers applied to every response (defense-in-depth).
  // Note: camera=(self) is kept ON because the browser-side KYC step needs the webcam.
  async headers() {
    const securityHeaders = [
      // Prevent this site from being embedded in an iframe → clickjacking protection
      { key: 'X-Frame-Options', value: 'DENY' },
      // Stop browsers from MIME-sniffing a response away from the declared type
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      // Do not leak full URLs to third parties on cross-origin navigation
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      // Least-privilege browser features: allow camera only for our own KYC page
      { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
      // Force HTTPS for 2 years (Vercel serves HTTPS); protects against SSL-strip
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    ];
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

module.exports = nextConfig;
