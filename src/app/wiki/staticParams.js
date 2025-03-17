/**
 * 静的ビルド時に生成するWikiページのIDリストを提供します
 * 静的エクスポートでも動的コンテンツを扱うためのユーティリティ
 */
export async function generateStaticWikiParams() {
  try {
    // プロダクション環境では、重要な記事IDリストを返す
    // これにより、最重要ページのみを事前生成し、それ以外は動的に処理
    return [
      { id: "placeholder" },
      { id: "welcome" },
      { id: "getting-started" },
      // 必要に応じて重要な記事IDを追加
    ];
  } catch (error) {
    console.error("Failed to generate wiki parameters:", error);
    // エラー時はフォールバックとして最低限のページを生成
    return [{ id: "placeholder" }];
  }
}
