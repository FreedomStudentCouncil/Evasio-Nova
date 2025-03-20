import React from 'react';
import { FiBold, FiItalic, FiList, FiLink, FiImage, FiCode, FiHash } from 'react-icons/fi';
import { BsBlockquoteLeft, BsListOl } from 'react-icons/bs';
import { motion } from 'framer-motion';

interface MarkdownToolbarProps {
  onInsert: (markdown: string) => void;
  onImageClick?: () => void;
  className?: string;
}

export default function MarkdownToolbar({ onInsert, onImageClick, className = '' }: MarkdownToolbarProps) {
  const tools = [
    { icon: FiHash, label: '見出し', markdown: '## ' },
    { icon: FiBold, label: '太字', markdown: '**太字**' },
    { icon: FiItalic, label: '斜体', markdown: '*斜体*' },
    { icon: FiLink, label: 'リンク', markdown: '[リンクテキスト](URL)' },
    { icon: FiImage, label: '画像', action: onImageClick },
    { icon: FiCode, label: 'コード', markdown: '```\nコード\n```' },
    { icon: FiList, label: '箇条書き', markdown: '- ' },
    { icon: BsListOl, label: '番号付きリスト', markdown: '1. ' },
    { icon: BsBlockquoteLeft, label: '引用', markdown: '> ' },
  ];

  return (
    <div className={`flex flex-wrap gap-1 p-2 bg-white/5 rounded-t-lg border-b border-white/10 ${className}`}>
      {tools.map((tool, index) => (
        <motion.button
          key={index}
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => tool.action ? tool.action() : onInsert(tool.markdown || '')}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors tooltip-trigger"
          title={tool.label}
        >
          <tool.icon className="w-4 h-4" />
          <span className="sr-only">{tool.label}</span>
        </motion.button>
      ))}
    </div>
  );
}
