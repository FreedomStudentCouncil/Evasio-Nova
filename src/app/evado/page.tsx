"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
// JSON形式のデータをインポート
// 相対パスに変更
import diagnosisData from "../../data/diagnosis-data.json";

// 型定義
interface Choice {
  text: string;
  nextQuestionId: string | null;
}

interface Question {
  id: string;
  text: string;
  choices: Choice[];
}

interface Result {
  id: string;
  title: string;
  description: string;
  wikiId: string;
}

export default function EvadoPage() {
  const [currentQuestionId, setCurrentQuestionId] = useState("start");
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentResult, setCurrentResult] = useState<Result | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);

  useEffect(() => {
    try {
      // 現在の質問IDに基づいて質問または結果を取得
      const findQuestion = () => {
        const question = diagnosisData.questions.find(q => q.id === currentQuestionId);
        if (question) {
          setCurrentQuestion(question);
          setCurrentResult(null);
          return;
        }

        // 質問が見つからない場合は結果を検索
        const result = diagnosisData.results.find(r => r.id === currentQuestionId);
        if (result) {
          setCurrentResult(result);
          setCurrentQuestion(null);
        }
      };

      findQuestion();
    } catch (error) {
      console.error("診断データの読み込みエラー:", error);
    }
  }, [currentQuestionId]);

  const handleOptionSelect = (nextQuestionId: string | null, index: number) => {
    if (isAnimating || !nextQuestionId) return;
    
    setSelectedChoice(index);
    setIsAnimating(true);
    setTimeout(() => {
      setHistory([...history, currentQuestionId]);
      setCurrentQuestionId(nextQuestionId);
      setIsAnimating(false);
      setSelectedChoice(null);
    }, 300);
  };

  const handleBack = () => {
    if (history.length === 0 || isAnimating) return;
    
    setIsAnimating(true);
    setTimeout(() => {
      const newHistory = [...history];
      const previousQuestionId = newHistory.pop();
      setHistory(newHistory);
      if (previousQuestionId) setCurrentQuestionId(previousQuestionId);
      setIsAnimating(false);
    }, 300);
  };

  // 結果表示画面
  if (currentResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white">
        <div className="container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mx-auto bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20"
          >
            <h1 className="text-3xl font-bold text-center mb-2">診断結果</h1>
            <div className="w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 mb-6 rounded-full"></div>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <h2 className="text-2xl font-semibold mb-4">{currentResult.title}</h2>
              <p className="text-slate-300 mb-6">{currentResult.description}</p>
              
              <div className="flex flex-col gap-4">
                <Link href={`/wiki/${currentResult.wikiId}`}>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    Wiki記事を読む
                  </motion.button>
                </Link>
                
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ y: 0 }}
                  onClick={handleBack}
                  className="w-full py-3 bg-white/10 rounded-lg font-semibold hover:bg-white/15 transition-all duration-300"
                >
                  戻る
                </motion.button>
                
                <Link href="/">
                  <motion.button
                    whileHover={{ y: -2 }}
                    whileTap={{ y: 0 }}
                    className="w-full py-3 bg-transparent border border-white/20 rounded-lg font-semibold hover:bg-white/5 transition-all duration-300"
                  >
                    ホームに戻る
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  // 質問画面
  if (currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white">
        <div className="container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mx-auto bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20"
          >
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">クイック診断</h1>
              <div className="text-sm text-slate-300">
                ステップ {history.length + 1}
              </div>
            </div>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestionId}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="space-y-3"
              >
                <h2 className="text-xl font-semibold mb-6">{currentQuestion.text}</h2>
                
                {currentQuestion.choices.map((choice, index) => (
                  <button
                    key={index}
                    onClick={() => handleOptionSelect(choice.nextQuestionId, index)}
                    className={`w-full py-3 px-4 bg-white/10 rounded-lg text-left transition-all duration-300 
                      hover:scale-[1.03] active:scale-[0.97] relative overflow-hidden
                      ${selectedChoice === index ? 'bg-white/20' : 'hover:bg-white/15'}
                      ${selectedChoice === index ? 'before:absolute before:inset-0 before:bg-gradient-to-r before:from-blue-500/20 before:to-purple-500/20 before:animate-shimmer' : ''}
                    `}
                    disabled={isAnimating}
                  >
                    {choice.text}
                  </button>
                ))}
              </motion.div>
            </AnimatePresence>
            
            <div className="mt-8 flex justify-between">
              {history.length > 0 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleBack}
                  className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/15 transition-all duration-300"
                >
                  ← 戻る
                </motion.button>
              )}
              
              <Link href="/" className="ml-auto">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 bg-white/5 rounded-lg hover:bg-white/10 transition-all duration-300"
                >
                  ホームに戻る
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // 読み込み中表示
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white flex justify-center items-center">
      <div className="text-xl">読み込み中...</div>
    </div>
  );
}
