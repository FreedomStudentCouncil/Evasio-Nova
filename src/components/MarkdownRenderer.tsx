"use client";

import ReactMarkdown from 'react-markdown';

// 型エラーを回避するためのシンプルなラッパーコンポーネント
export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown className="markdown-body">
      {content}
    </ReactMarkdown>
  );
}
