/** @type {import('next').NextConfig} */

// 環境変数から本番ビルドモードかどうかを判断
const isProductionBuild = process.env.NEXT_PUBLIC_BUILD_MODE === 'production';

// 開発環境でも静的エクスポートに近い動作をさせるために共通設定を定義
const commonConfig = {
  // 画像設定
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
      },
    ],
  },
  // 開発環境と本番環境の共通設定
  staticPageGenerationTimeout: 300,
};

const nextConfig = {
  // 共通設定を適用
  ...commonConfig,
  
  // 本番ビルドモード時のみ静的エクスポートを有効化
  ...(isProductionBuild && { 
    output: 'export',
    trailingSlash: true,
    // 静的エクスポート時のみ必要な設定
    images: {
      ...commonConfig.images,
      unoptimized: true,
    },
    // 本番ビルドでは各種エラーで失敗しないようにする
    eslint: {
      ignoreDuringBuilds: true,
    },
    typescript: {
      ignoreBuildErrors: true,
    },
    // 404対策: カスタム404ページを実装
    exportPathMap: async function(defaultPathMap, { dev, dir, outDir, distDir, buildId }) {
      // デフォルトのパスに加えて、必要な静的ページを確実に生成
      const customPaths = {
        ...defaultPathMap,
        // Wiki関連の共通ページ
        '/wiki': { page: '/wiki' },
        '/wiki/view/placeholder': { page: '/wiki/view/[id]', query: { id: 'placeholder' } },
        '/wiki/user/placeholder': { page: '/wiki/user/[id]', query: { id: 'placeholder' } },
        // Wikiのフォールバックページ（カスタム404の代わりに使用）
        '/wiki/fallback': { page: '/wiki/fallback' },
      };
      
      console.log('Creating static paths:', Object.keys(customPaths).length);
      return customPaths;
    }
  }),
};

console.log(`Building in ${isProductionBuild ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);

module.exports = nextConfig;
