/**
 * デバッグユーティリティ関数
 */

/**
 * 例外の詳細情報を取得（開発中の問題解決に役立つ）
 * @param error 捕捉されたエラー
 * @returns エラーの詳細情報を含む文字列
 */
export function getErrorDetails(error: any): string {
  if (!error) return 'エラーオブジェクトがありません';
  
  // Firebaseエラーの詳細を抽出
  if (error.name === 'FirebaseError') {
    return `Firebase ${error.code}: ${error.message}
    詳細: ${error.details || 'なし'}
    スタック: ${error.stack || 'なし'}`;
  }
  
  // 通常のJavaScriptエラー
  return `${error.name || 'Error'}: ${error.message || error.toString()}
  スタック: ${error.stack || 'スタックトレースなし'}`;
}

/**
 * Firestoreの権限エラーかどうかをチェック
 * @param error 捕捉されたエラー
 * @returns 権限エラーの場合はtrue
 */
export function isPermissionError(error: any): boolean {
  return (
    error && 
    error.name === 'FirebaseError' && 
    (error.code === 'permission-denied' || 
     error.message.includes('Missing or insufficient permissions'))
  );
}

/**
 * ドキュメントパスをコンソール出力用にフォーマット
 * @param path Firestoreのドキュメントパス
 * @returns フォーマットされたパス文字列
 */
export function formatDocPath(collection: string, docId: string): string {
  return `${collection}/${docId}`;
}

/**
 * 開発環境かどうかをチェック
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * デバッグログ（開発環境でのみ出力）
 * @param message ログメッセージ
 * @param data 追加データ（オプション）
 */
export function debugLog(message: string, data?: any): void {
  if (isDevelopment()) {
    console.log(`[DEBUG] ${message}`, data ? data : '');
  }
}
