import AdminSystemClient from "../../../components/admin/AdminSystemClient";
import type { Viewport } from 'next';
import type { Metadata } from 'next';

export const viewport: Viewport = {
  themeColor: '#1e1b4b'
};

export const metadata: Metadata = {
  title: 'システム管理 - Evasio-Nova',
  description: 'Evasio-Novaのシステム管理画面です',
};

export default function AdminSystemPage() {
  return <AdminSystemClient />;
}
