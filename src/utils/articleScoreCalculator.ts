/**
 * 記事の品質スコアを計算するユーティリティ
 * いいね、役に立った数、記事の長さや記法の活用度などから総合スコアを算出
 */

// マークダウン記法の種類をチェックするための正規表現
const MARKDOWN_PATTERNS = {
  heading: /^#{1,6}\s.+/gm, // 見出し (# や ##)
  link: /\[.+\]\(.+\)/g, // リンク
  image: /!\[.+\]\(.+\)/g, // 画像
  list: /^[*-]\s.+/gm, // 箇条書き
  orderedList: /^\d+\.\s.+/gm, // 順序付きリスト
  bold: /\*\*[^*]+\*\*/g, // 太字 (**)
  italic: /\*[^*]+\*/g, // 斜体 (*)
};

/**
 * 記事のマークダウン記法の使用状況を計算
 * @param content 記事の本文
 * @returns 0-1の間のスコア（記法の使用度）
 */
export function calculateMarkdownDiversity(content: string): number {
  if (!content) return 0;
  
  let usedPatterns = 0;
  let totalPatterns = Object.keys(MARKDOWN_PATTERNS).length;
  
  // 各マークダウン記法が使われているかチェック
  for (const [key, pattern] of Object.entries(MARKDOWN_PATTERNS)) {
    if (content.match(pattern)) {
      usedPatterns++;
    }
  }
  
  // 使用度スコアを計算 (0-1の範囲)
  return usedPatterns / totalPatterns;
}

/**
 * 記事の長さに基づいたスコアを計算
 * @param content 記事の本文
 * @returns 0-1の間のスコア（長さベース）
 */
export function calculateLengthScore(content: string): number {
  if (!content) return 0;
  
  // 文字数に基づいたスコア計算
  // 1000文字以上で満点、100文字未満は低スコア
  const charCount = content.length;
  
  if (charCount >= 1000) return 1.0;
  if (charCount <= 100) return 0.2;
  
  // 100-1000文字の間は線形に増加
  return 0.2 + (charCount - 100) * 0.8 / (1000 - 100);
}

/**
 * 記事の評価（いいね、役に立った）に基づくスコアを計算
 * @param likeCount いいね数
 * @param usefulCount 役に立った数
 * @param dislikeCount 低評価数
 * @returns 評価ベースのスコア
 */
export function calculateRatingScore(
  likeCount: number = 0, 
  usefulCount: number = 0, 
  dislikeCount: number = 0
): number {
  // 役に立った評価は高いウェイト
  const usefulWeight = 2;
  // 低評価はマイナス要素
  const dislikeWeight = -3;
  
  // 基本スコア = いいね + (役に立った × 2) - (低評価 × 3)
  let baseScore = likeCount + (usefulCount * usefulWeight) + (dislikeCount * dislikeWeight);
  
  // 負の値にならないよう調整
  baseScore = Math.max(0, baseScore);
  
  // 評価が多いほど価値が高いが、スコアに上限を設ける
  // 0から10の範囲にマッピング
  const maxExpectedRating = 50; // この値以上で満点
  let ratingScore = Math.min(baseScore, maxExpectedRating) / maxExpectedRating * 10;
  
  return ratingScore;
}

/**
 * 記事の総合スコアを計算
 * @param content 記事の本文
 * @param likeCount いいね数
 * @param usefulCount 役に立った数
 * @param dislikeCount 低評価数
 * @returns 0-100の間の総合スコア
 */
export function calculateArticleScore(
  content: string,
  likeCount: number = 0,
  usefulCount: number = 0,
  dislikeCount: number = 0
): number {
  // マークダウン使用度スコア (0-1) * 25 => 0-25点
  const markdownScore = calculateMarkdownDiversity(content) * 25;
  
  // 記事の長さスコア (0-1) * 25 => 0-25点
  const lengthScore = calculateLengthScore(content) * 25;
  
  // 評価ベースのスコア (0-10) * 5 => 0-50点
  const ratingScore = calculateRatingScore(likeCount, usefulCount, dislikeCount) * 5;
  
  // 総合スコア (0-100点)
  const totalScore = markdownScore + lengthScore + ratingScore;
  
  return Math.round(totalScore);
}
