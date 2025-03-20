"use client";
import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { FiLogIn, FiMail, FiLock, FiAlertCircle, FiUserPlus, FiCheckCircle } from "react-icons/fi";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { loginWithEmail, registerWithEmail } from "../../firebase/auth";
import TermsDialog from "../../components/TermsDialog";
import { isUsernameTaken } from "../../firebase/user";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState(""); // 新規登録時のみ使用
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(""); // 追加
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signInWithGoogle } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [displayNameError, setDisplayNameError] = useState("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  // 表示名の検証を行う（debounce付き）
  useEffect(() => {
    if (!displayName || !isSignUp) return;

    const timer = setTimeout(async () => {
      setIsCheckingUsername(true);
      try {
        const taken = await isUsernameTaken(displayName);
        if (taken) {
          setDisplayNameError("他の人がすでに使用している名前です");
        } else {
          setDisplayNameError("");
        }
      } catch (err) {
        console.error("ユーザー名チェックエラー:", err);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500); // 500ms後に実行

    return () => clearTimeout(timer);
  }, [displayName, isSignUp]);

  // 標準ログイン処理
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(""); // 追加: 処理開始時にメッセージをクリア

    if (isSignUp) {
      if (!termsAccepted) {
        setShowTerms(true);
        return;
      }
      if (displayNameError) {
        setError("表示名を確認してください");
        return;
      }
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        // 新規登録
        await registerWithEmail(email, password, displayName || undefined);
        setSuccess("登録確認メールを送信しました。メールをご確認ください。");
        return;
      } else {
        // ログイン
        await loginWithEmail(email, password);
      }
      router.push("/"); // ログイン成功したらホームページへ
    } catch (err: any) {
      console.error("認証エラー:", err);
      handleAuthError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTermsAccept = async () => {
    if (isSignUp) {
      setTermsAccepted(true);
      try {
        await registerWithEmail(email, password, displayName || undefined);
        setSuccess("登録確認メールを送信しました。メールをご確認ください。");
      } catch (err: any) {
        console.error("登録エラー:", err);
        handleAuthError(err);
      }
    }
  };

  // エラーハンドリング
  const handleAuthError = (error: Error & { code?: string }) => {
    const errorCode = error.code || '';
    switch (errorCode) {
      case "auth/invalid-email":
        setError("無効なメールアドレスです");
        break;
      case "auth/user-disabled":
        setError("このアカウントは無効です");
        break;
      case "auth/user-not-found":
        setError("ユーザーが見つかりません");
        break;
      case "auth/wrong-password":
        setError("パスワードが間違っています");
        break;
      case "auth/weak-password":
        setError("パスワードは6文字以上必要です");
        break;
      case "auth/email-already-in-use":
        setError("このメールアドレスは既に使用されています");
        break;
      case "username/already-in-use":  // 追加
        setError("他の人がすでに使用している名前です");
        break;
      case 'email-not-verified':
        setError("メールアドレスの認証が完了していません。メールをご確認ください。");
        break;
      default:
        setError("認証に失敗しました");
    }
  };

  // Googleログイン処理
  const handleGoogleSignIn = async () => {
    try {
      setError("");
      setRedirecting(true); // リダイレクト状態を設定

      await signInWithGoogle();
      
      // 開発環境では即座にホームへリダイレクト
      // 本番環境ではGoogleへのリダイレクトが発生するため、ここには到達しない
      if (process.env.NODE_ENV !== 'production') {
        router.push("/");
      }
    } catch (err) {
      console.error("Googleログインエラー:", err);
      setError("Googleログインに失敗しました");
      setRedirecting(false); // リダイレクト状態をリセット
    }
  };

  // リダイレクト中の表示
  if (redirecting && process.env.NODE_ENV === 'production') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          </div>
          <h2 className="text-xl font-semibold mb-2">Googleにリダイレクトしています...</h2>
          <p className="text-slate-300">しばらくお待ちください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white flex items-center justify-center p-4">
      <TermsDialog
        isOpen={showTerms}
        onClose={() => setShowTerms(false)}
        onAccept={handleTermsAccept}
      />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 w-full max-w-md"
      >
        <h1 className="text-3xl font-bold mb-2 text-center">
          {isSignUp ? "アカウント作成" : "ログイン"}
        </h1>
        <p className="text-slate-300 text-center mb-6">
          {isSignUp 
            ? "新しいアカウントを作成して機能を利用しましょう" 
            : "アカウントにログインしてWiki記事の作成や評価を行いましょう"}
        </p>
        
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/20 border border-red-500/40 rounded-lg p-3 mb-4 flex items-center"
          >
            <FiAlertCircle className="text-red-400 mr-2 flex-shrink-0" />
            <p className="text-red-200 text-sm">{error}</p>
          </motion.div>
        )}
        
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-500/20 border border-green-500/40 rounded-lg p-3 mb-4 flex items-center"
          >
            <FiCheckCircle className="text-green-400 mr-2 flex-shrink-0" />
            <p className="text-green-200 text-sm">{success}</p>
          </motion.div>
        )}
        
        <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
          {/* 表示名入力（新規登録時のみ） */}
          {isSignUp && (
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium mb-1">
                表示名
              </label>
              <div className="relative">
                <FiUserPlus className="absolute left-3 top-3 text-slate-400" />
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={`w-full bg-white/10 border ${
                    displayNameError ? 'border-red-500' : 'border-white/20'
                  } rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 ${
                    displayNameError ? 'focus:ring-red-500' : 'focus:ring-purple-500'
                  }`}
                  placeholder="あなたの表示名"
                />
                {isCheckingUsername && (
                  <div className="absolute right-3 top-3">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                  </div>
                )}
              </div>
              {displayNameError && (
                <p className="text-red-400 text-sm mt-1">{displayNameError}</p>
              )}
            </div>
          )}
          
          {/* メールアドレス */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              メールアドレス *
            </label>
            <div className="relative">
              <FiMail className="absolute left-3 top-3 text-slate-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="your@email.com"
                required
              />
            </div>
          </div>
          
          {/* パスワード */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              パスワード *
            </label>
            <div className="relative">
              <FiLock className="absolute left-3 top-3 text-slate-400" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="••••••••"
                required
              />
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center
              ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <FiLogIn className="mr-2" />
            {isLoading ? '処理中...' : isSignUp ? 'アカウント作成' : 'ログイン'}
          </motion.button>
          
          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              {isSignUp ? 'すでにアカウントをお持ちの方はこちら' : 'アカウントをお持ちでない方はこちら'}
            </button>
          </div>
        </form>
        
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/20"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-slate-900/50 px-2 text-sm text-slate-300">または</span>
          </div>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGoogleSignIn}
          className="w-full py-3 bg-white/10 rounded-lg font-semibold hover:bg-white/15 transition-all duration-300 flex items-center justify-center"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115Z" />
            <path fill="#34A853" d="M16.04 18.013c-1.09.703-2.474 1.078-4.04 1.078a7.077 7.077 0 0 1-6.723-4.823l-4.04 3.067A11.965 11.965 0 0 0 12 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987Z" />
            <path fill="#4A90E2" d="M19.834 21c2.195-2.048 3.62-5.096 3.62-9 0-.71-.109-1.473-.272-2.182H12v4.637h6.436c-.317 1.559-1.17 2.766-2.395 3.558L19.834 21Z" />
            <path fill="#FBBC05" d="M5.277 14.268A7.12 7.12 0 0 1 4.909 12c0-.782.125-1.533.357-2.235L1.24 6.65A11.934 11.934 0 0 0 0 12c0 1.92.445 3.73 1.237 5.335l4.04-3.067Z" />
          </svg>
          Googleでログイン
        </motion.button>
        
        <div className="mt-8 text-center">
          <Link href="/">
            <button className="text-sm text-slate-300 hover:text-white">
              ホームに戻る
            </button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
