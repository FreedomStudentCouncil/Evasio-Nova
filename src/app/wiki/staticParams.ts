import { db } from "../../firebase/config";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";

/**
 * 静的ビルド時に実行される関数
 * 重要な記事IDを返して静的生成対象とする
 */
export async function generateStaticWikiParams() {
  if (process.env.NODE_ENV === 'production') {
    try {
      // 本番環境では人気記事IDを取得してビルド時に生成
      const articlesRef = collection(db, "wikiArticles");
      
      // 人気度順（usefulCountが多い）に上位30件を取得 - 数を増やして主要記事をカバー
      const q = query(articlesRef, orderBy("usefulCount", "desc"), limit(30));
      const querySnapshot = await getDocs(q);
      
      const params = querySnapshot.docs.map(doc => ({ id: doc.id }));
      
      // プレースホルダーも追加しておく
      params.push({ id: "placeholder" });
      
      console.log(`静的生成対象の記事ID: ${params.length}件`);
      return params;
    } catch (error) {
      console.error("静的パラメータ生成エラー:", error);
    }
  }
  
  // 開発環境またはエラー時はプレースホルダーとダミーを返す
  return [
    { id: "placeholder" },
    { id: "example-article-1" },
    { id: "example-article-2" }
  ];
}

/**
 * ユーザープロファイルページの静的パラメータを生成
 * 重要なユーザーIDのみを返す
 */
export async function generateStaticUserParams() {
  if (process.env.NODE_ENV === 'production') {
    try {
      // 本番環境では主要な投稿者のIDを取得
      const articlesRef = collection(db, "wikiArticles");
      
      // 投稿記事数が多い上位のユーザーを取得するためのクエリ - 数を増やして主要ユーザーをカバー
      const q = query(articlesRef, orderBy("authorId"), limit(20));
      const querySnapshot = await getDocs(q);
      
      // ユニークなauthorIdを抽出
      const authorIds = new Set<string>();
      querySnapshot.docs.forEach(doc => {
        const authorId = doc.data().authorId;
        if (authorId) {
          authorIds.add(authorId);
        }
      });
      
      const params = Array.from(authorIds).map(id => ({ id }));
      
      // プレースホルダーも追加しておく
      params.push({ id: "placeholder" });
      
      console.log(`静的生成対象のユーザーID: ${params.length}件`);
      return params;
    } catch (error) {
      console.error("静的ユーザーパラメータ生成エラー:", error);
    }
  }
  
  // 開発環境またはエラー時はプレースホルダーとダミーを返す
  return [
    { id: "placeholder" },
    { id: "example-user-1" },
    { id: "example-user-2" },
    { id: "example-user-3" }
  ];
}
