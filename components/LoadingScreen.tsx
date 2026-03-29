import React, { useEffect, useState } from 'react';

const MESSAGES = [
  "正在挑選基酒...",
  "分析你的心情...",
  "嘗試一些大膽的組合...",
  "正在搖盪...",
  "加入冰塊...",
  "裝飾最後的點綴...",
];

const LoadingScreen: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
      {/* CSS Loader representing a shaker or mixing */}
      <div className="relative w-24 h-24 mb-8">
        <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-t-pink-500 border-r-purple-500 border-b-cyan-500 border-l-transparent rounded-full animate-spin"></div>
        <div className="absolute inset-4 bg-gradient-to-tr from-pink-500/20 to-cyan-500/20 rounded-full blur-md animate-pulse"></div>
        <div className="absolute inset-0 flex items-center justify-center text-4xl">
          🍸
        </div>
      </div>
      
      <h3 className="text-2xl font-bold text-white mb-2 serif tracking-wider animate-pulse">
        AI 調酒師工作中
      </h3>
      <p className="text-slate-400 text-lg transition-all duration-500 h-8">
        {MESSAGES[messageIndex]}
      </p>
    </div>
  );
};

export default LoadingScreen;