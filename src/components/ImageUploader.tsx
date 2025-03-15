"use client";
import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiUpload, FiX, FiCheck, FiLoader } from 'react-icons/fi';
import Image from 'next/image';
import { useImgur } from '../hooks/useImgur';

interface ImageUploaderProps {
  onUploadComplete: (imageUrl: string, imageId: string) => void;
  className?: string;
}

export default function ImageUploader({ onUploadComplete, className = '' }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    upload, 
    handleFileChange, 
    reset, 
    isUploading, 
    error, 
    imageData, 
    previewUrl 
  } = useImgur({
    onSuccess: (response) => {
      onUploadComplete(response.link, response.id);
    }
  });

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileChange(file);
      await upload(file);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleFileChange(file);
      await upload(file);
    }
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  const handleReset = () => {
    reset();
  };

  return (
    <div className={`${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        className="hidden"
      />
      
      {!previewUrl ? (
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleClickUpload}
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors
            ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-white/30 hover:border-white/50'}`}
        >
          <FiUpload className="text-3xl mb-2" />
          <p className="text-center text-sm">
            画像をドラッグ＆ドロップするか、クリックして選択
          </p>
          <p className="text-xs text-white/60 mt-1">
            PNG, JPG, GIF 最大10MB
          </p>
        </motion.div>
      ) : (
        <div className="relative">
          <div className="relative overflow-hidden rounded-lg">
            {previewUrl && (
              <div className="relative w-full h-64">
                <Image
                  src={previewUrl}
                  alt="Preview"
                  fill
                  style={{objectFit: "contain"}}
                  className="rounded-lg"
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                  {isUploading ? (
                    <FiLoader className="text-3xl animate-spin text-white" />
                  ) : error ? (
                    <div className="text-center p-4">
                      <FiX className="text-3xl text-red-500 mx-auto mb-2" />
                      <p className="text-sm text-red-300">アップロードエラー</p>
                    </div>
                  ) : imageData ? (
                    <FiCheck className="text-3xl text-green-500" />
                  ) : null}
                </div>
              </div>
            )}
          </div>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleReset}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
          >
            <FiX />
          </motion.button>
        </div>
      )}
      
      {error && (
        <p className="mt-2 text-xs text-red-400">
          {error.message || 'アップロードに失敗しました。もう一度お試しください。'}
        </p>
      )}
    </div>
  );
}
