"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useLanguage } from '@/lib/i18n/LanguageContext';


interface StartupScreenProps {
  onComplete: () => void;
}

export const StartupScreen: React.FC<StartupScreenProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    setIsMounted(true);
    
    // 1秒后允许跳过
    const skipTimer = setTimeout(() => {
      setCanSkip(true);
    }, 1000);
    
    // 2秒后开始淡化
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 2000);

    // 2.5秒后完全隐藏并通知完成
    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete();
    }, 2500);

    return () => {
      clearTimeout(skipTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  const handleSkip = () => {
    if (canSkip) {
      setFadeOut(true);
      setTimeout(() => {
        setIsVisible(false);
        onComplete();
      }, 300);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'} ${canSkip ? 'cursor-pointer' : ''}`}
      onClick={handleSkip}
    >
      {/* 背景DNA动画效果 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-black to-blue-800/20"></div>
        
        {/* DNA螺旋动画 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-96 h-96 opacity-30">
            <svg
              className="absolute inset-0 w-full h-full animate-spin-slow"
              viewBox="0 0 400 400"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* DNA螺旋线 */}
              <path
                d="M200 50 Q250 100 200 150 Q150 200 200 250 Q250 300 200 350"
                stroke="url(#gradient1)"
                strokeWidth="2"
                fill="none"
                opacity="0.6"
              />
              <path
                d="M200 50 Q150 100 200 150 Q250 200 200 250 Q150 300 200 350"
                stroke="url(#gradient2)"
                strokeWidth="2"
                fill="none"
                opacity="0.6"
              />
              
              {/* 连接线 */}
              {isMounted && [...Array(8)].map((_, i) => {
                const y = 70 + i * 35;
                const offset = Math.sin(i * 0.5) * 30;
                return (
                  <line
                    key={i}
                    x1={200 - offset}
                    y1={y}
                    x2={200 + offset}
                    y2={y}
                    stroke="url(#gradient3)"
                    strokeWidth="1"
                    opacity="0.4"
                  />
                );
              })}
              
              {/* 节点 */}
              {isMounted && [...Array(12)].map((_, i) => {
                const angle = (i * 30) * (Math.PI / 180);
                const radius = 80 + Math.sin(i * 0.3) * 20;
                const x = 200 + Math.cos(angle) * radius;
                const y = 200 + Math.sin(angle) * radius;
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="4"
                    fill="url(#gradient4)"
                    opacity="0.8"
                  />
                );
              })}
              
              {/* 渐变定义 */}
              <defs>
                <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#1E40AF" />
                </linearGradient>
                <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#60A5FA" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
                <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#93C5FD" />
                  <stop offset="100%" stopColor="#60A5FA" />
                </linearGradient>
                <radialGradient id="gradient4" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#DBEAFE" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </radialGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>

      {/* Logo容器 */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        {/* 主Logo */}
        <div className="relative mb-8 transform transition-all duration-1000 hover:scale-105">
          {/* 多层发光效果 */}
          <div className="absolute inset-0 bg-blue-500/30 rounded-2xl blur-2xl animate-pulse"></div>
          <div className="absolute inset-0 bg-cyan-400/20 rounded-xl blur-xl animate-pulse" style={{animationDelay: '0.5s'}}></div>
          
          {/* RESP-X文字容器 */}
          <div className="relative px-8 py-6 bg-gradient-to-br from-blue-900/30 via-transparent to-cyan-900/30 backdrop-blur-sm rounded-xl border border-blue-400/30">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-wider text-center">
              <span className="bg-gradient-to-r from-blue-300 via-cyan-300 to-blue-400 bg-clip-text text-transparent drop-shadow-2xl">
                {t.startup.title}
              </span>
              <span className="text-sm sm:text-base md:text-lg align-top text-cyan-300 ml-2 drop-shadow-lg">™</span>
            </h1>
            
            {/* 装饰性分子结构 */}
            <div className="absolute -top-4 -right-4 w-8 h-8 opacity-60">
              <svg viewBox="0 0 32 32" className="w-full h-full">
                <circle cx="8" cy="8" r="2" fill="#60A5FA" />
                <circle cx="24" cy="8" r="2" fill="#34D399" />
                <circle cx="16" cy="24" r="2" fill="#F59E0B" />
                <line x1="8" y1="8" x2="24" y2="8" stroke="#60A5FA" strokeWidth="1" opacity="0.6" />
                <line x1="24" y1="8" x2="16" y2="24" stroke="#34D399" strokeWidth="1" opacity="0.6" />
                <line x1="16" y1="24" x2="8" y2="8" stroke="#F59E0B" strokeWidth="1" opacity="0.6" />
              </svg>
            </div>
            
            <div className="absolute -bottom-4 -left-4 w-6 h-6 opacity-40">
              <svg viewBox="0 0 24 24" className="w-full h-full">
                <circle cx="12" cy="6" r="1.5" fill="#A78BFA" />
                <circle cx="6" cy="18" r="1.5" fill="#FB7185" />
                <circle cx="18" cy="18" r="1.5" fill="#4ADE80" />
                <line x1="12" y1="6" x2="6" y2="18" stroke="#A78BFA" strokeWidth="1" opacity="0.8" />
                <line x1="6" y1="18" x2="18" y2="18" stroke="#FB7185" strokeWidth="1" opacity="0.8" />
              </svg>
            </div>
          </div>
        </div>

        {/* 副标题 */}
        <div className="text-center mb-8 space-y-3">
          <p className="text-lg sm:text-xl md:text-2xl text-cyan-300 font-medium tracking-wide">
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {t.startup.subtitle}
            </span>
          </p>
          <div className="w-24 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent mx-auto"></div>
          <p className="text-xs sm:text-sm md:text-base text-blue-300/80 px-4">
            {t.startup.description}
          </p>
          <p className="text-xs text-cyan-400/60">
            {t.startup.poweredBy}
          </p>
        </div>

        {/* 加载动画 */}
        <div className="flex items-center justify-center space-x-3">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce shadow-lg shadow-blue-400/50"></div>
          <div className="w-3 h-3 bg-cyan-400 rounded-full animate-bounce shadow-lg shadow-cyan-400/50" style={{animationDelay: '0.1s'}}></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce shadow-lg shadow-blue-400/50" style={{animationDelay: '0.2s'}}></div>
        </div>
        
        {/* 进度提示 */}
        <div className="mt-6 text-center">
          <p className="text-xs text-blue-400/60 animate-pulse">
            {t.startup.initializing}
          </p>
          {canSkip && (
            <p className="text-xs text-cyan-400/80 mt-2 animate-pulse">
              点击任意位置跳过
            </p>
          )}
        </div>
      </div>

      {/* 底部版权信息 */}
      <div className="absolute bottom-4 sm:bottom-8 left-1/2 transform -translate-x-1/2 text-center">
        <p className="text-xs text-blue-400/60 mb-1">
          {t.startup.copyright}
        </p>
        <p className="text-xs text-cyan-400/40">
          {t.startup.platform}
        </p>
      </div>

    </div>
  );
};

export default StartupScreen;