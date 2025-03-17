/**
 * Wiki関連のヘルパー関数を提供するモジュール
 */

/**
 * クライアントサイドでのwikiページナビゲーション
 * @param router Next.jsのrouterオブジェクト
 * @param path 現在のパス
 */
export function handleWikiNavigation(router: any, path: string) {
  if (!path) return;

  const pathSegments = path.split('/').filter(Boolean);
  if (pathSegments[0] !== 'wiki') return;
  
  try {
    if (pathSegments.length === 3 && pathSegments[1] === 'view') {
      // wiki/view/[id]の形式
      const articleId = pathSegments[2];
      if (articleId !== 'fallback') {
        router.replace(`/wiki/view/${articleId}`);
      } else {
        router.replace('/wiki');
      }
    } else if (pathSegments.length === 2) {
      // 古い形式 wiki/[id] の場合は新形式にリダイレクト
      const articleId = pathSegments[1];
      if (articleId !== 'fallback' && articleId !== 'user') {
        router.replace(`/wiki/view/${articleId}`);
      }
    } else if (pathSegments.length >= 3 && pathSegments[1] === 'user') {
      // wiki/user/[id]の形式
      const userId = pathSegments[2];
      router.replace(`/wiki/user/${userId}`);
    } else {
      // その他のwikiパターン
      router.replace('/wiki');
    }
  } catch (error) {
    console.error('ナビゲーションエラー:', error);
    router.replace('/wiki');
  }
}

/**
 * 静的出力環境での404対応を行う
 */
export function setupWiki404Handler() {
  // 静的ビルド環境でのみ実行
  if (typeof window === 'undefined') return;
  
  // SPAとしての動作を模倣
  window.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');
    
    if (!anchor) return;
    
    // wikiパス内での内部リンクの場合
    if (anchor.href && 
        anchor.href.includes(window.location.origin) &&
        anchor.href.includes('/wiki/')) {
      
      // 既に生成されているパスかどうか確認する術がないため
      // SPAとして扱うようhrefを書き換え
      e.preventDefault();
      
      const path = anchor.href.replace(window.location.origin, '');
      window.history.pushState({}, '', path);
      
      // ページコンテンツの再読み込み処理はフロントエンドフレームワークに任せる
      const event = new CustomEvent('wiki:navigate', { detail: { path } });
      window.dispatchEvent(event);
    }
  });
}
