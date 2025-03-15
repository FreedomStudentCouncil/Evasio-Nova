import { getAllArticles } from '../firebase/wiki';

// ビルド時にデータをプリロードするヘルパー関数
export async function preloadWikiData() {
  try {
    // すべての記事を取得
    const articles = await getAllArticles();
    // JSONとして保存する場合（Next.jsのpublic/dataディレクトリに保存する例）
    const fs = require('fs');
    const path = require('path');
    const dataDir = path.join(process.cwd(), 'public', 'data');
    
    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // データをJSON形式で保存
    fs.writeFileSync(
      path.join(dataDir, 'wiki-articles.json'),
      JSON.stringify(articles)
    );
    
    console.log(`${articles.length} articles preloaded for static deployment`);
    return articles;
  } catch (error) {
    console.error('Failed to preload wiki data:', error);
    return [];
  }
}
