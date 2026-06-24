/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 把这些原生/外部模块从 server bundle 排除，避免 webpack 编译失败
  // - better-sqlite3: dev 本地 SQLite 驱动（原生 binding）
  // - @libsql/client: Vercel 上连 Turso 远端的驱动
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3", "@libsql/client"],
  },
};

export default nextConfig;
