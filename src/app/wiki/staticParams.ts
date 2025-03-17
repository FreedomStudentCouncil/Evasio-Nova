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
      // 人気度順（usefulCountが多い）に上位10件を取得
      const q = query(articlesRef, orderBy("usefulCount", "desc"), limit(10));
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
  
  // 開発環境またはエラー時はプレースホルダーのみ返す
  return [{ id: "placeholder" }];
}

/**
 * ユーザープロファイルページの静的パラメータを生成
 * 重要なユーザーIDのみを返す
 */
export async function generateStaticUserParams() {
  // 管理者やメインのコントリビューターなど、重要なユーザーのID
  return [
    { id: "placeholder" }
    // 必要に応じて重要なユーザーIDを追加
  ];
}
