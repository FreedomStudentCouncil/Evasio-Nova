import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Evasio-Nova',
  description: 'ネットやデバイス制限環境の中にある諸君に知恵を授けます。',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-24x24.png', sizes: '24x24', type: 'image/png' },
      { url: '/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-36x36.png', sizes: '36x36', type: 'image/png' },
      { url: '/icon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icon-72x72.png', sizes: '72x72', type: 'image/png' },
      { url: '/icon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icon-128x128.png', sizes: '128x128', type: 'image/png' },
      { url: '/icon-144x144.png', sizes: '144x144', type: 'image/png' },
      { url: '/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icon-160x160.png', sizes: '160x160', type: 'image/png' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-196x196.png', sizes: '196x196', type: 'image/png' },
      { url: '/icon-256x256.png', sizes: '256x256', type: 'image/png' },
      { url: '/icon-384x384.png', sizes: '384x384', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon-57x57.png', sizes: '57x57' },
      { url: '/apple-touch-icon-60x60.png', sizes: '60x60' },
      { url: '/apple-touch-icon-72x72.png', sizes: '72x72' },
      { url: '/apple-touch-icon-76x76.png', sizes: '76x76' },
      { url: '/apple-touch-icon-114x114.png', sizes: '114x114' },
      { url: '/apple-touch-icon-120x120.png', sizes: '120x120' },
      { url: '/apple-touch-icon-144x144.png', sizes: '144x144' },
      { url: '/apple-touch-icon-152x152.png', sizes: '152x152' },
      { url: '/apple-touch-icon-180x180.png', sizes: '180x180' },
    ],
    other: [
      {
        rel: 'apple-touch-icon',
        url: '/apple-touch-icon.png',
      },
      {
        rel: 'shortcut icon',
        url: '/favicon.ico',
      },
    ],
  },
  themeColor: '#0078d7',
  other: {
    'msapplication-TileColor': '#0078d7',
    'msapplication-square70x70logo': '/site-tile-70x70.png',
    'msapplication-square150x150logo': '/site-tile-150x150.png',
    'msapplication-wide310x150logo': '/site-tile-310x150.png',
    'msapplication-square310x310logo': '/site-tile-310x310.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <head>
        {/* Next.jsが自動的にmetadataからメタタグを生成するため、
            ほとんどのメタタグは自動的に注入されます */}
        {/* 標準的なNext.jsのメタデータシステムでサポートされていない特殊なメタタグがある場合は
            ここに追加することができます */}
      </head>
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
