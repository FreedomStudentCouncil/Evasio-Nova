/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.jsのデフォルト設定では、`output: 'export'`は通常コメントアウトされています
  // SSGモードを使用している場合は以下のようにコメントを外し、適切に設定します
  // output: 'export', // SSG (Static Site Generation) を有効にする場合
  
  // 画像最適化の設定も必要かもしれません
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
      },
    ],
    // SSG設定を使用している場合は以下のunoptimized設定が必要かもしれません
    // unoptimized: true, 
  },
};

export default nextConfig;
