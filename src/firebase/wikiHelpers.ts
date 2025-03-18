/**
 * Wiki関連のヘルパー関数を提供するモジュール
 */

/**
 * クエリパラメータ付きURLを生成する
 * @param baseUrl ベースURL
 * @param params クエリパラメータ
 * @returns 完全なURL
 */
export function buildUrl(baseUrl: string, params: Record<string, string>) {
  const url = new URL(baseUrl, window.location.origin);
  
  // パラメータを追加
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.append(key, value);
    }
  });
  
  return url.toString();
}
