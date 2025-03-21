/**
 * 記事のスコアを計算するユーティリティ関数
 * 100点満点で評価
 */

/**
 * 記事のスコアを計算
 * @param content 記事の内容
 * @param likeCount いいね数
 * @param usefulCount 有用数
 * @param dislikeCount 低評価数
 * @returns 記事のスコア（0-100）
 */
export function calculateArticleScore(
  content: string,
  likeCount: number,
  usefulCount: number,
  dislikeCount: number = 0
): number {
  // コンテンツの量によるスコア (0-30点)
  const contentLength = content.length;
  let contentScore = 0;
  
  if (contentLength >= 5000) {
    contentScore = 30; // 十分な長さ
  } else if (contentLength >= 3000) {
    contentScore = 25; // 良い長さ
  } else if (contentLength >= 1500) {
    contentScore = 20; // 適切な長さ
  } else if (contentLength >= 800) {
    contentScore = 15; // 最低限の長さ
  } else if (contentLength >= 400) {
    contentScore = 10; // 短い
  } else {
    contentScore = 5; // 非常に短い
  }
  
  // コンテンツの質によるスコア (0-30点)
  // マークダウンの見出しや箇条書きなどの使用を評価
  let qualityScore = 0;
  
  // 見出しの使用（h1, h2, h3）
  const headingsCount = (content.match(/(?:^|\n)#{1,3} /g) || []).length;
  if (headingsCount >= 5) {
    qualityScore += 10;
  } else if (headingsCount >= 3) {
    qualityScore += 8;
  } else if (headingsCount >= 1) {
    qualityScore += 5;
  }
  
  // 箇条書きの使用
  const bulletPointsCount = (content.match(/(?:^|\n)[*\-+] /g) || []).length;
  if (bulletPointsCount >= 10) {
    qualityScore += 10;
  } else if (bulletPointsCount >= 5) {
    qualityScore += 7;
  } else if (bulletPointsCount >= 1) {
    qualityScore += 3;
  }
  
  // リンクの使用
  const linksCount = (content.match(/\[.*?\]\(.*?\)/g) || []).length;
  if (linksCount >= 5) {
    qualityScore += 5;
  } else if (linksCount >= 3) {
    qualityScore += 3;
  } else if (linksCount >= 1) {
    qualityScore += 1;
  }
  
  // 画像の使用
  const imagesCount = (content.match(/!\[.*?\]\(.*?\)/g) || []).length;
  if (imagesCount >= 3) {
    qualityScore += 5;
  } else if (imagesCount >= 1) {
    qualityScore += 3;
  }
  
  // 30点を超えないようにする
  qualityScore = Math.min(qualityScore, 30);
  
  // ユーザー評価によるスコア (0-40点)
  // likeとusefulが多いほど高いスコア、dislikeがあると減点
  let userRatingScore = 0;
  
  // いいねによる評価
  if (likeCount >= 50) {
    userRatingScore += 15;
  } else if (likeCount >= 25) {
    userRatingScore += 12;
  } else if (likeCount >= 10) {
    userRatingScore += 8;
  } else if (likeCount >= 5) {
    userRatingScore += 5;
  } else if (likeCount >= 1) {
    userRatingScore += 2;
  }
  
  // 有用カウントによる評価（より重み付け）
  if (usefulCount >= 30) {
    userRatingScore += 25;
  } else if (usefulCount >= 15) {
    userRatingScore += 20;
  } else if (usefulCount >= 8) {
    userRatingScore += 15;
  } else if (usefulCount >= 3) {
    userRatingScore += 10;
  } else if (usefulCount >= 1) {
    userRatingScore += 5;
  }
  
  // 低評価による減点
  if (dislikeCount >= 10) {
    userRatingScore -= 15;
  } else if (dislikeCount >= 5) {
    userRatingScore -= 10;
  } else if (dislikeCount >= 3) {
    userRatingScore -= 5;
  } else if (dislikeCount >= 1) {
    userRatingScore -= 2;
  }
  
  // 0-40の範囲に収める
  userRatingScore = Math.max(0, Math.min(userRatingScore, 40));
  
  // 最終スコアを計算（100点満点）
  const finalScore = contentScore + qualityScore + userRatingScore;
  
  return finalScore;
}
