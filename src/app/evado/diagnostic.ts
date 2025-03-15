// 診断データの型定義
export interface Choice {
  text: string;
  nextQuestionId: string | null;
}

export interface Question {
  id: string;
  text: string;
  choices: Choice[];
}

export interface Result {
  id: string;
  title: string;
  description: string;
  wikiId: string;
}

export interface DiagnosticData {
  questions: Question[];
  results: Result[];
}

/**
 * 質問IDから質問を取得する
 * @param data 診断データ
 * @param questionId 質問ID
 * @returns 質問オブジェクトまたはnull
 */
export function findQuestion(data: DiagnosticData, questionId: string): Question | null {
  return data.questions.find(q => q.id === questionId) || null;
}

/**
 * 結果IDから結果を取得する
 * @param data 診断データ
 * @param resultId 結果ID
 * @returns 結果オブジェクトまたはnull
 */
export function findResult(data: DiagnosticData, resultId: string): Result | null {
  return data.results.find(r => r.id === resultId) || null;
}

/**
 * IDが質問か結果かを判定する
 * @param data 診断データ
 * @param id 検索するID
 * @returns "question" または "result" または null
 */
export function determineType(data: DiagnosticData, id: string): "question" | "result" | null {
  if (findQuestion(data, id)) return "question";
  if (findResult(data, id)) return "result";
  return null;
}
