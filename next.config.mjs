import nextPWA from "next-pwa";

/** @type {import('next').NextConfig} */
let nextConfig = {
  // 他のNext.js設定があればここに記述
  // 404ページの設定
  async redirects() {
    return [];
  },
  // 404ページの設定
  async rewrites() {
    return [];
  },
};

// PWA設定を追加
const withPWA = nextPWA({
  dest: "public", // Service Workerファイルの出力先
  register: true, // Service Workerを自動登録
  skipWaiting: true, // 新しいService Workerをすぐに有効化
  disable: process.env.NODE_ENV === "development", // 開発環境では無効化
  runtimeCaching: [
    // キャッシュ戦略 (必要に応じて調整)
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts",
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
    {
      urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "static-font-assets",
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "static-image-assets",
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\.(?:js)$/i,
      handler: "StaleWhileRevalidate", // JSファイルは更新をチェックしつつキャッシュを利用
      options: {
        cacheName: "static-js-assets",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\.(?:css|less)$/i,
      handler: "StaleWhileRevalidate", // CSSファイルも同様
      options: {
        cacheName: "static-style-assets",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      // ドキュメントMarkdownファイルもキャッシュ (API経由ではなく直接fetchする場合)
      urlPattern: /\/documents\/.*\.md$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "document-cache",
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
    {
      urlPattern: /.*/i, // その他のリクエスト (APIルートなどは除く)
      handler: "NetworkFirst", // まずネットワークを試行し、失敗したらキャッシュを利用
      options: {
        cacheName: "others",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        networkTimeoutSeconds: 10, // ネットワークタイムアウト
      },
    },
    // AI関連のAPIルート (/api/extract-*, /api/generate-quiz) は
    // オフラインでは機能しないため、キャッシュ戦略から除外するか、
    // NetworkOnly に設定します (デフォルトでキャッシュされない可能性が高い)。
  ],
});

// PWA設定を適用
nextConfig = withPWA(nextConfig);

export default nextConfig;
