/** @type {import('next').NextConfig} */
const nextConfig = {
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
    ],
  },
};

module.exports = nextConfig;