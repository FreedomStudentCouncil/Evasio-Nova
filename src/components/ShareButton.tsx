import { useState } from "react";
import { FiShare2, FiCheck, FiCopy, FiTwitter, FiFacebook } from "react-icons/fi";
import { motion } from "framer-motion";

interface ShareButtonProps {
  title: string;
  url?: string;
}

export default function ShareButton({ title, url }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // 現在のURLを取得（クライアントサイドでのみ実行）
  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  
  // URLをコピーする関数
  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      // 2秒後にコピー状態をリセット
      setTimeout(() => setCopied(false), 2000);
    });
  };
  
  // Twitter共有用URL
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`;
  
  // Facebook共有用URL
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800"
      >
        <FiShare2 className="text-lg" />
        <span className="hidden sm:inline">共有</span>
      </button>
      
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-lg border border-gray-200 z-10"
        >
          <div className="p-2">
            <button
              onClick={copyToClipboard}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded flex items-center gap-2"
            >
              {copied ? <FiCheck className="text-green-500" /> : <FiCopy />}
              <span>{copied ? "コピーしました" : "URLをコピー"}</span>
            </button>
            
            <a
              href={twitterShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3 py-2 hover:bg-gray-100 rounded flex items-center gap-2"
            >
              <FiTwitter className="text-blue-400" />
              <span>Twitterで共有</span>
            </a>
            
            <a
              href={facebookShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3 py-2 hover:bg-gray-100 rounded flex items-center gap-2"
            >
              <FiFacebook className="text-blue-600" />
              <span>Facebookで共有</span>
            </a>
          </div>
        </motion.div>
      )}
    </div>
  );
}
