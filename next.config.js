const { withSentryConfig } = require("@sentry/nextjs");

// Enable bundle analyzer when ANALYZE=true
let withBundleAnalyzer;
try {
  withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: process.env.ANALYZE === 'true' });
} catch (e) {
  // fallback if the package isn't installed yet
  withBundleAnalyzer = (config) => config;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/c/:handle",
        destination: "/business-card/:handle",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "ideogram.ai" },
      { protocol: "https", hostname: "copilot.microsoft.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "cdn.midjourney.com" },
      { protocol: "https", hostname: "oaidalleapiprodscus.blob.core.windows.net" },
      { protocol: "https", hostname: "**" },
    ],
  },
};

// Apply bundle analyzer wrapper if available
const maybeAnalyzedConfig = withBundleAnalyzer(nextConfig);

module.exports = withSentryConfig(maybeAnalyzedConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  disableLogger: true,
});