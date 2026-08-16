const defaultRuntimeCaching = require('next-pwa/cache');

// next-pwa's default "start-url" rule (registerRoute("/", NetworkFirst))
// is a literal string match against "/" — it never matches this app's
// real start_url, "/?source=pwa" (see manifest.json), or any other
// query string. Those requests fall through to the generic same-origin
// "others" rule instead, which caches the HTML document itself for 24h.
// A PWA cold-launch on a slow mobile connection can time out (10s) and
// get served that day-old HTML — which references JS chunk hashes from
// a since-superseded deploy, reproducing the exact "stale module graph"
// crashes (React #310/#418, insertBefore/removeChild, stale Server
// Action ids) tracked as ErrorGroup #63/#67/#68/#72, every one of them
// on a fresh "?source=pwa" launch, still recurring days after the
// client-side reload mitigation shipped. A short-timeout, short-TTL
// rule ahead of "others" fixes it at the source: a network hiccup still
// gets a same-minute fallback, but the HTML can never be meaningfully
// stale relative to whatever's currently deployed.
const runtimeCaching = [
  {
    urlPattern: ({ request, url }) =>
      self.origin === url.origin && request.mode === 'navigate',
    handler: 'NetworkFirst',
    options: {
      cacheName: 'html-navigations',
      expiration: {
        maxEntries: 16,
        maxAgeSeconds: 60,
      },
      networkTimeoutSeconds: 4,
    },
  },
  ...defaultRuntimeCaching,
];

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*.lottie",
        headers: [
          { key: "Content-Type", value: "application/zip" },
          { key: "Cache-Control", value: "public, max-age=86400, immutable" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'crm.namamicleans.com',
      }
    ],
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

module.exports = withPWA(nextConfig)

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
