// next.config.mjs
export default {
  reactStrictMode: true,
  swcMinify: true,
  webpack(config, { isServer }) {
    if (!isServer) {
      // Exclude Node.js-specific modules from being bundled in the client-side code
      config.resolve.fallback = {
        fs: false,
        path: false,
        os: false,
        buffer: false,
      };
    }
    return config;
  },
};
