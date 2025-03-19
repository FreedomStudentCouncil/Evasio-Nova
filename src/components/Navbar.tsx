"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { FiMenu, FiX, FiHome, FiBook, FiHelpCircle, FiUser, FiLogOut, FiLogIn } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  
  // 画面幅が変更された時にメニューを閉じる
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsOpen(false);
      }
    };
    
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);
  
  // ページ移動時にメニューを閉じる
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const isActive = (path: string) => {
    return pathname === path || (path !== "/" && pathname.startsWith(path));
  };

  return (
    <nav className="fixed top-0 z-50 w-full bg-slate-900/80 backdrop-blur-md border-b border-white/10">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* ロゴ */}
            <Link href="/">
            <div className="flex items-center">
              <img src="/favicon.ico" alt="Evasio-Nova Logo" className="h-6 w-6 mr-2" />
              <span className="text-xl font-bold text-white">Evasio-Nova</span>
            </div>
            </Link>
          
          {/* デスクトップメニュー */}
          <div className="hidden md:flex items-center">
            <div className="flex space-x-1 mr-4">
              <NavLink href="/" icon={<FiHome />} text="ホーム" isActive={isActive("/")} />
              <NavLink href="/wiki" icon={<FiBook />} text="Wiki" isActive={isActive("/wiki")} />
              <NavLink href="/evado" icon={<FiHelpCircle />} text="診断" isActive={isActive("/evado")} />
            </div>
            
            {user ? (
              <div className="flex items-center">
                <Link href={`/wiki/user?id=${user.uid}`}>
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center text-sm px-3 py-2 rounded-lg hover:bg-white/10 transition-colors mr-2"
                  >
                    <FiUser className="mr-2" />
                    <span>{user.displayName || "ユーザー"}</span>
                  </motion.div>
                </Link>
                
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={signOut}
                  className="text-sm px-3 py-2 bg-white/10 rounded-lg hover:bg-white/15 transition-colors"
                >
                  <FiLogOut className="mr-2 inline" />
                  ログアウト
                </motion.button>
              </div>
            ) : (
              <Link href="/login">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-sm px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg hover:shadow-lg transition-all"
                >
                  <FiLogIn className="mr-2 inline" />
                  ログイン
                </motion.button>
              </Link>
            )}
          </div>
          
          {/* モバイルメニューボタン */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden bg-white/10 p-2 rounded-lg"
          >
            {isOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>
      </div>
      
      {/* モバイルメニュー */}
      <motion.div
        initial={false}
        animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className={`md:hidden overflow-hidden`}
      >
        <div className="container mx-auto px-4 py-2 pb-4 flex flex-col space-y-1">
          <NavLink href="/" icon={<FiHome />} text="ホーム" isActive={isActive("/")} mobile />
          <NavLink href="/wiki" icon={<FiBook />} text="Wiki" isActive={isActive("/wiki")} mobile />
          <NavLink href="/evado" icon={<FiHelpCircle />} text="診断" isActive={isActive("/evado")} mobile />
          
          <div className="border-t border-white/10 my-2 pt-2">
            {user ? (
              <>
                <NavLink href={`/wiki/user/${user.uid}`} icon={<FiUser />} text={user.displayName || "ユーザー"} mobile />
                <div
                  onClick={signOut}
                  className="flex items-center py-2 px-3 rounded-lg hover:bg-white/10 cursor-pointer"
                >
                  <FiLogOut className="mr-3" />
                  <span>ログアウト</span>
                </div>
              </>
            ) : (
              <NavLink href="/login" icon={<FiLogIn />} text="ログイン" isActive={isActive("/login")} mobile />
            )}
          </div>
        </div>
      </motion.div>
    </nav>
  );
}

interface NavLinkProps {
  href: string;
  icon: React.ReactNode;
  text: string;
  isActive?: boolean;
  mobile?: boolean;
}

function NavLink({ href, icon, text, isActive = false, mobile = false }: NavLinkProps) {
  return (
    <Link href={href}>
      <div
        className={`flex items-center ${mobile ? "py-2" : "py-1"} px-3 rounded-lg transition-colors
          ${isActive 
            ? "bg-white/20 text-white" 
            : "hover:bg-white/10 text-white/80"}`}
      >
        <span className={`${mobile ? "mr-3" : "mr-2"}`}>{icon}</span>
        <span>{text}</span>
      </div>
    </Link>
  );
}
