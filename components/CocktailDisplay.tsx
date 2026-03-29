
import React, { useEffect, useState } from 'react';
import { GeneratedCocktail } from '../types';
import { RefreshCcw, Share2, Wine, List, ScrollText, Sparkles, Check, Loader2, Bookmark, BookmarkCheck, ArrowLeft, Globe } from 'lucide-react';
import html2canvas from 'html2canvas';
import { auth, db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { PublishModal } from './PublishModal';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const compressImage = (base64Str: string, maxWidth = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    if (!base64Str.startsWith('data:image')) {
      resolve(base64Str);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64Str);
    img.src = base64Str;
  });
};

interface CocktailDisplayProps {
  cocktail: GeneratedCocktail;
  onReset?: () => void;
  onBack?: () => void;
}

const CocktailDisplay: React.FC<CocktailDisplayProps> = ({ cocktail, onReset, onBack }) => {
  const [isShared, setIsShared] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  
  useEffect(() => {
    // Scroll to top when result is displayed
    window.scrollTo(0, 0);
  }, []);

  const handleSave = async () => {
    if (!auth.currentUser || isSaved || isSaving) return;
    
    setIsSaving(true);
    try {
      let finalImageUrl = cocktail.imageUrl || '';
      if (finalImageUrl) {
        finalImageUrl = await compressImage(finalImageUrl);
      }

      await addDoc(collection(db, 'users', auth.currentUser.uid, 'cocktails'), {
        uid: auth.currentUser.uid,
        name: cocktail.name,
        description: cocktail.description,
        ingredients: cocktail.ingredients,
        instructions: cocktail.instructions,
        glassware: cocktail.glassware,
        garnish: cocktail.garnish,
        visualPrompt: cocktail.visualPrompt,
        imageUrl: finalImageUrl,
        createdAt: serverTimestamp()
      });
      setIsSaved(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${auth.currentUser.uid}/cocktails`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (isShared || isSharing) return;
    
    setIsSharing(true);
    
    try {
        const element = document.body;
        
        // Use html2canvas with extensive options to ensure full page capture
        const canvas = await html2canvas(element, {
            useCORS: true, // Important for external images (Gemini generated)
            allowTaint: true,
            backgroundColor: '#0f172a', // Force background color matching theme
            logging: false,
            scale: 2, // 2x scale for better resolution (Retina-like)
            
            // Explicitly set canvas dimensions to the full scrollable content
            width: document.documentElement.scrollWidth,
            height: document.documentElement.scrollHeight,
            
            // Set window dimensions to ensure media queries match desktop/mobile correctly
            windowWidth: document.documentElement.scrollWidth,
            windowHeight: document.documentElement.scrollHeight,
            
            // Force start coordinates to top-left
            x: 0,
            y: 0,
            scrollX: 0,
            scrollY: 0,

            // Modify the cloned document before rendering to ensure visibility
            onclone: (clonedDoc) => {
                // 1. Force all animated elements to be fully visible and static
                const animatedElements = clonedDoc.querySelectorAll('.animate-slide-up, .animate-fade-in, .animate-fade-in-up, .animate-fade-in-down');
                animatedElements.forEach((el) => {
                    const element = el as HTMLElement;
                    element.style.opacity = '1';
                    element.style.transform = 'none';
                    element.style.animation = 'none';
                    element.style.transition = 'none';
                });

                // 2. Handle the fixed background blobs in App.tsx
                // 'fixed' background often clips in long screenshots. Change to absolute full-height.
                const bg = clonedDoc.querySelector('.fixed.inset-0');
                if (bg) {
                    const bgEl = bg as HTMLElement;
                    bgEl.style.position = 'absolute';
                    bgEl.style.height = '100%';
                    bgEl.style.width = '100%';
                    bgEl.style.top = '0';
                    bgEl.style.left = '0';
                    bgEl.style.zIndex = '-1';
                }
            }
        });

        canvas.toBlob(async (blob) => {
            if (!blob) {
                console.error("Blob generation failed");
                setIsSharing(false);
                return;
            }

            try {
                // Write to clipboard
                const item = new ClipboardItem({ 'image/png': blob });
                await navigator.clipboard.write([item]);
                
                setIsShared(true);
                setTimeout(() => {
                    setIsShared(false);
                }, 3000);
            } catch (err) {
                console.error("Failed to copy image to clipboard", err);
                alert("您的瀏覽器不支援自動複製圖片，請手動截圖分享！");
            } finally {
                setIsSharing(false);
            }
        }, 'image/png');

    } catch (err) {
        console.error("Screenshot failed", err);
        alert("截圖失敗，請稍後再試");
        setIsSharing(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes slideUpFade {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slideUpFade 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          opacity: 0;
        }
      `}</style>

      {/* Toast Notification - Hidden from screenshot via data attribute */}
      <div 
        data-html2canvas-ignore="true"
        className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ease-out transform pointer-events-none ${
          isShared ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
        }`}
      >
        <div className="bg-slate-800/90 backdrop-blur-md border border-emerald-500/30 text-emerald-100 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
          <div className="bg-emerald-500 rounded-full p-1 shadow-lg shadow-emerald-500/20">
            <Check className="w-3 h-3 text-white stroke-[3]" />
          </div>
          <span className="font-medium text-sm tracking-wide">已複製截圖到剪貼簿！</span>
        </div>
      </div>

      <div className="w-full max-w-4xl mx-auto pb-24 animate-fade-in-up">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
          
          {/* Header Image Section */}
          <div className="relative h-96 md:h-[500px] w-full bg-slate-900 group">
            {cocktail.imageUrl ? (
              <img 
                src={cocktail.imageUrl} 
                alt={cocktail.name} 
                className="w-full h-full object-cover transition-transform duration-1000 hover:scale-105"
                referrerPolicy="no-referrer"
              />
            ) : (
               <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                 <span className="text-slate-600">Image Generation Unavailable</span>
               </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-90" />
            
            <div className="absolute bottom-0 left-0 p-8 w-full">
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-2 serif text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-purple-200 to-cyan-200">
                {cocktail.name}
              </h1>
              <p className="text-lg md:text-xl text-slate-300 italic max-w-2xl font-light">
                "{cocktail.description}"
              </p>
            </div>
          </div>

          {/* Content Section */}
          <div className="grid md:grid-cols-2 gap-8 p-8">
            
            {/* Ingredients */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-amber-300 mb-4">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <List className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold serif">所需材料</h3>
              </div>
              <ul className="space-y-3">
                {cocktail.ingredients.map((ing, idx) => (
                  <li 
                    key={idx} 
                    className="flex items-center gap-3 text-slate-300 bg-white/5 p-3 rounded-lg border border-white/5 animate-slide-up"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    {ing}
                  </li>
                ))}
              </ul>
              
               <div className="mt-6 p-4 bg-slate-900/50 rounded-xl border border-white/5 animate-slide-up" style={{ animationDelay: `${cocktail.ingredients.length * 100}ms` }}>
                  <div className="flex items-center gap-2 text-slate-400 mb-2">
                      <Wine className="w-4 h-4" />
                      <span className="text-sm uppercase tracking-wider">建議杯具</span>
                  </div>
                  <p className="text-white">{cocktail.glassware}</p>
               </div>
               <div className="p-4 bg-slate-900/50 rounded-xl border border-white/5 animate-slide-up" style={{ animationDelay: `${(cocktail.ingredients.length * 100) + 100}ms` }}>
                  <div className="flex items-center gap-2 text-slate-400 mb-2">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-sm uppercase tracking-wider">裝飾</span>
                  </div>
                  <p className="text-white">{cocktail.garnish}</p>
               </div>
            </div>

            {/* Instructions */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-cyan-300 mb-4">
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                  <ScrollText className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold serif">調製步驟</h3>
              </div>
              <ol className="space-y-4 relative border-l border-white/10 ml-3">
                {cocktail.instructions.map((step, idx) => (
                  <li 
                    key={idx} 
                    className="ml-6 relative animate-slide-up"
                    style={{ animationDelay: `${(cocktail.ingredients.length * 100) + 200 + (idx * 100)}ms` }}
                  >
                    <span className="absolute -left-[31px] flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 ring-1 ring-white/20 text-xs font-bold text-cyan-300">
                      {idx + 1}
                    </span>
                    <p className="text-slate-300 leading-relaxed bg-white/5 p-4 rounded-lg border border-white/5">
                      {step}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        {/* Action Buttons - Hidden from screenshot via data attribute */}
        <div data-html2canvas-ignore="true" className="flex flex-col md:flex-row gap-4 mt-8 justify-center items-center flex-wrap">
            {auth.currentUser && !onBack && (
              <button
                  onClick={handleSave}
                  disabled={isSaving || isSaved}
                  className={`
                      group relative px-8 py-3 rounded-full font-bold shadow-lg transition-all duration-300 flex items-center gap-2 overflow-hidden active:scale-95
                      ${isSaved 
                          ? 'bg-pink-600 text-white cursor-default' 
                          : 'bg-slate-800 hover:bg-slate-700 text-white border border-white/10 hover:border-white/20'
                      }
                  `}
              >
                  {isSaving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isSaved ? (
                      <BookmarkCheck className="w-5 h-5" />
                  ) : (
                      <Bookmark className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  )}
                  <span>
                      {isSaving ? '儲存中...' : isSaved ? '已儲存' : '收藏酒譜'}
                  </span>
              </button>
            )}

            {auth.currentUser && (
              <button
                  onClick={() => setShowPublishModal(true)}
                  disabled={isPublished}
                  className={`
                      group relative px-8 py-3 rounded-full font-bold shadow-lg transition-all duration-300 flex items-center gap-2 overflow-hidden active:scale-95
                      ${isPublished 
                          ? 'bg-purple-600 text-white cursor-default' 
                          : 'bg-slate-800 hover:bg-slate-700 text-white border border-white/10 hover:border-white/20'
                      }
                  `}
              >
                  {isPublished ? (
                      <Check className="w-5 h-5" />
                  ) : (
                      <Globe className="w-5 h-5 group-hover:scale-110 transition-transform text-purple-400" />
                  )}
                  <span>
                      {isPublished ? '已發布至社群' : '發布至社群'}
                  </span>
              </button>
            )}

            <button
                onClick={handleShare}
                disabled={isSharing || isShared}
                className={`
                    group relative px-8 py-3 rounded-full font-bold shadow-lg transition-all duration-300 flex items-center gap-2 overflow-hidden active:scale-95
                    ${isShared 
                        ? 'bg-emerald-600 text-white cursor-default' 
                        : 'bg-slate-800 hover:bg-slate-700 text-white border border-white/10 hover:border-white/20'
                    }
                `}
            >
                {isSharing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : isShared ? (
                    <Check className="w-5 h-5 animate-bounce" />
                ) : (
                    <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                )}
                <span>
                    {isSharing ? '正在截圖...' : isShared ? '已複製連結' : '分享飲品'}
                </span>
            </button>

            {onBack ? (
              <button
                  onClick={onBack}
                  className="px-8 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 transition-all duration-300 flex items-center gap-2 active:scale-95"
              >
                  <ArrowLeft className="w-5 h-5" />
                  <span>返回列表</span>
              </button>
            ) : onReset ? (
              <button
                  onClick={onReset}
                  className="px-8 py-3 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-105 transition-all duration-300 flex items-center gap-2 active:scale-95"
              >
                  <RefreshCcw className="w-5 h-5" />
                  <span>再調一杯</span>
              </button>
            ) : null}
        </div>
      </div>

      {showPublishModal && (
        <PublishModal 
          cocktail={cocktail} 
          onClose={() => setShowPublishModal(false)} 
          onSuccess={() => {
            setShowPublishModal(false);
            setIsPublished(true);
          }} 
        />
      )}
    </>
  );
};

export default CocktailDisplay;
