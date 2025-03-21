import { Metadata } from 'next';
import { getArticleById, getArticleCountById } from '../../../firebase/wiki';
import WikiArticleView from '../../../components/WikiArticleView';
import { notFound } from 'next/navigation';
import { WikiArticle } from '../../../types/wiki';

interface PageProps {
  params: {};
  searchParams: { [key: string]: string | string[] | undefined };
}

// Firestoreオブジェクトを安全にシリアライズする関数
function serializeArticle(article: WikiArticle): WikiArticle {
  return {
    ...article,
    id: article.id || "", // idが未定義の場合は空文字列を設定
    // Timestamp形式の日付をISO文字列に変換
    date: article.date ? 
      (typeof article.date === 'string' ? 
        article.date : 
        // Timestamp オブジェクトの場合
        (article.date.toDate ? 
          article.date.toDate().toISOString() : 
          // seconds/nanoseconds形式の場合
          new Date(article.date.seconds * 1000).toISOString()
        )
      ) : 
      null,
    // 最終更新日も同様に変換
    lastUpdated: article.lastUpdated ? 
      (typeof article.lastUpdated === 'string' ? 
        article.lastUpdated : 
        (article.lastUpdated.toDate ? 
          article.lastUpdated.toDate().toISOString() : 
          new Date(article.lastUpdated.seconds * 1000).toISOString()
        )
      ) : 
      null
  };
}

export async function generateMetadata(
  { searchParams }: PageProps
): Promise<Metadata> {
  // searchParamsからidを取得
  const id = searchParams.id as string | undefined;
  
  if (!id) {
    return {
      title: 'Wiki - 記事が見つかりません',
      description: '指定された記事が見つかりませんでした。'
    };
  }
  
  try {
    const article = await getArticleById(id);
    
    if (!article) {
      return {
        title: 'Wiki - 記事が見つかりません',
        description: '指定された記事が見つかりませんでした。'
      };
    }
    
    return {
      title: `${article.title} - Evasio-Nova Wiki`,
      description: article.description || article.content.substring(0, 160),
      openGraph: {
        title: `${article.title} - Evasio-Nova Wiki`,
        description: article.description || article.content.substring(0, 160),
        images: article.imageUrl ? [article.imageUrl] : []
      }
    };
  } catch (error) {
    console.error('メタデータ生成エラー:', error);
    return {
      title: 'Wiki - エラーが発生しました',
      description: '記事の読み込み中にエラーが発生しました。'
    };
  }
}

export default async function WikiViewPage(
  { searchParams }: PageProps
) {
  // searchParamsからidを取得
  const id = searchParams.id as string | undefined;
  
  if (!id) {
    return notFound();
  }
  
  try {
    // メインDBから記事データを取得
    const article = await getArticleById(id);
    
    if (!article) {
      return notFound();
    }
    
    // searchDBから最新の評価データを取得
    // idが文字列であることを保証する
    const counts = await getArticleCountById(id);
    
    // 記事データに最新の評価カウントを上書き
    const articleWithCounts = {
      ...article,
      id: article.id || id, // idが未定義の場合はURLのIDを使用
      likeCount: counts.likeCount,
      usefulCount: counts.usefulCount,
      dislikeCount: counts.dislikeCount
    };
    
    // Firestoreオブジェクトをシリアライズ可能な形式に変換
    const serializedArticle = serializeArticle(articleWithCounts);
    
    return <WikiArticleView article={serializedArticle} />;
  } catch (error) {
    console.error('記事取得エラー:', error);
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white flex justify-center items-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">エラーが発生しました</h1>
          <p>記事の読み込み中にエラーが発生しました。もう一度お試しください。</p>
        </div>
      </div>
    );
  }
}
