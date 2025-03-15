import { db } from "../../firebase/config";
import { collection, getDocs } from "firebase/firestore";

// 静的ビルド時に実行される関数
export async function generateStaticWikiParams() {
  if (process.env.NODE_ENV === 'production') {
    try {
      // 記事IDを取得
      const articlesRef = collection(db, "wikiArticles");
      const querySnapshot = await getDocs(articlesRef);
      return querySnapshot.docs.map(doc => ({ id: doc.id }));
    } catch (error) {
      console.error("Generate static params error:", error);
    }
  }
  
  return [];
}

// 空のユーザーIDパラメーター（本番環境ではFirebaseから取得するよう改善可能）
export async function generateStaticUserParams() {
  return [];
}
