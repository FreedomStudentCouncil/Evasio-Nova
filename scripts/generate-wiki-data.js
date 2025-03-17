/**
 * 静的ビルド時にWikiデータを準備するスクリプト
 * 
 * このスクリプトは、静的ビルドプロセスの一環として実行され、
 * 重要なWiki記事データをJSONファイルとして生成します。
 * 
 * 使い方:
 * - 本番ビルド前に実行: `node scripts/generate-wiki-data.js`
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy, limit } = require('firebase/firestore');
const fs = require('fs').promises;
const path = require('path');

// Firebaseの設定（.envから読み込むか、直接ここに記述）
const firebaseConfig = {
  // Firebase configを記述またはprocess.env経由で取得
};

// Firebase初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function generateWikiData() {
  console.log('Wiki記事データの生成を開始...');
  
  try {
    // 出力ディレクトリの作成
    const outputDir = path.join(process.cwd(), 'public', 'data');
    await fs.mkdir(outputDir, { recursive: true });
    
    // 人気の記事を取得
    const articlesRef = collection(db, "wikiArticles");
    const q = query(articlesRef, orderBy("usefulCount", "desc"), limit(20));
    const snapshot = await getDocs(q);
    
    console.log(`${snapshot.docs.length}件の記事を処理中...`);
    
    // 各記事のデータをJSONファイルとして保存
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const articleData = {
        id: doc.id,
        title: data.title || "無題の記事",
        content: data.content || "",
        description: data.description || "",
        author: data.author || "匿名",
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        usefulCount: data.usefulCount || 0,
        likeCount: data.likeCount || 0
      };
      
      // JSONファイルとして保存
      await fs.writeFile(
        path.join(outputDir, `wiki-${doc.id}.json`),
        JSON.stringify(articleData, null, 2),
        'utf-8'
      );
    }
    
    // 記事一覧インデックスも保存
    const articlesList = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || "無題の記事",
        description: data.description || "",
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        usefulCount: data.usefulCount || 0,
        likeCount: data.likeCount || 0
      };
    });
    
    await fs.writeFile(
      path.join(outputDir, 'wiki-articles.json'),
      JSON.stringify(articlesList, null, 2),
      'utf-8'
    );
    
    console.log(`データ生成完了! 記事ファイル: ${snapshot.docs.length}件 + インデックスファイル`);
    
  } catch (error) {
    console.error('エラー発生:', error);
    process.exit(1);
  }
}

// スクリプト実行
generateWikiData();
