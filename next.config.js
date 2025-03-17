/** @type {import('next').NextConfig} */

// 環境変数から本番ビルドモードかどうかを判断
const isProductionBuild = process.env.NEXT_PUBLIC_BUILD_MODE === 'production';

const nextConfig = {
  // 本番ビルドモード時のみ静的エクスポートを有効化
  ...(isProductionBuild && { 
    output: 'export',
    trailingSlash: true
  }),
  
  // 静的ページ生成のタイムアウト設定
  staticPageGenerationTimeout: 180,
  
  // 実験的機能の設定
  experimental: {
    // ターボパックの設定
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
  
  // ESLintの設定
  eslint: {
    // 本番ビルドではESLintエラーでビルドを失敗させない
    ignoreDuringBuilds: isProductionBuild,
  },
  
  // TypeScriptの型チェック
  typescript: {
    // 本番ビルドでは型エラーでビルドを失敗させない
    ignoreBuildErrors: isProductionBuild,
  },
};

console.log(`Building in ${isProductionBuild ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);

module.exports = nextConfig;
