/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 16+: use remotePatterns instead of deprecated domains
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.worldlabs.ai" },
      { protocol: "https", hostname: "marble.worldlabs.ai" },
    ],
  },
  // Silence the turbopack/webpack warning — we don't need custom webpack rules
  // (R3F, drei, gaussian-splats-3d all work fine with Turbopack defaults)
  turbopack: {},
  // Required for gaussian-splats-3d SharedArrayBuffer usage
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ]
  },
}

module.exports = nextConfig
