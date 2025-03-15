/** @type {import('next').NextConfig} */

// 環境変数から本番ビルドモードかどうかを判断
// NEXT_PUBLIC_BUILD_MODE=production の場合、静的エクスポート用の設定が有効になる
const isProductionBuild = process.env.NEXT_PUBLIC_BUILD_MODE === 'production';

const nextConfig = {
  // 本番ビルドモード時のみ静的エクスポートを有効化
  ...(isProductionBuild && { output: 'export' }),
  
  // 静的ページ生成のタイムアウト設定
  staticPageGenerationTimeout: 180,
  
  // JSONモジュールサポートを有効化
  experimental: {
    serverComponentsExternalPackages: [],
    turbo: {
      rules: {
        // ビルドパフォーマンス向上のためのルール
      }
    }
  },
  
  // 画像設定
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
      },
    ],
    // 静的エクスポート時には画像の最適化を無効化
    ...(isProductionBuild && { unoptimized: true }),
  },
  
  // JSONファイルをモジュールとして扱うための設定
  webpack: (config) => {
    config.module.rules.push({
      test: /\.json$/,
      type: 'json',
    });
    
    return config;
  },
};

console.log(`Building in ${isProductionBuild ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);

module.exports = nextConfig;
