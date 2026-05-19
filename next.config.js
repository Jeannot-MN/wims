/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["typeorm", "@node-rs/argon2"],
  },
  webpack: (config) => {
    config.externals.push({
      "pg-native": "commonjs pg-native",
    });
    return config;
  },
};

module.exports = nextConfig;
