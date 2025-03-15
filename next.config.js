/** @type {import('next').NextConfig} */
const nextConfig = {
  // 静的サイト生成のための設定
  output: 'export',
  
  // JSON モジュールのサポートを明示的に有効化
  experimental: {
    serverComponentsExternalPackages: [],
  },
  
  // 静的ファイルやJSONファイルの処理設定
  webpack: (config) => {
    // JSONファイルをモジュールとして扱うための設定
    config.module.rules.push({
      test: /\.json$/,
      type: 'json',
    });
    
    return config;
  },
  
  // パス解決の設定
  async rewrites() {
    return [];
  },
  
  // 画像の最適化を無効化（静的エクスポート時に必要）
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
