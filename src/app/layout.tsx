import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Evasio-Nova',
  description: 'ネットやデバイス制限環境の中にある諸君に知恵を授けます',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <AuthProvider>
          <Navbar />
          <div className="pt-14">{/* Navbarの高さ分のパディング */}
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
