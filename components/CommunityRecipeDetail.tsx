import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import { doc, collection, query, orderBy, onSnapshot, runTransaction, serverTimestamp, getDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { CommunityRecipe, Review } from '../types';
import { ArrowLeft, Star, Loader2, MessageSquare, Send, Edit3, Clock, Trash2, Bookmark, BookmarkCheck, Share2, Check } from 'lucide-react';
import { EditRecipeModal } from './EditRecipeModal';
import html2canvas from 'html2canvas';

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

interface Props {
  recipe: CommunityRecipe;
  onBack: () => void;
}

export const CommunityRecipeDetail: React.FC<Props> = ({ recipe, onBack }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'community_recipes', recipe.id, 'reviews'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedReviews = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Review[];
      
      setReviews(fetchedReviews);
      
      if (auth.currentUser) {
        const myReview = fetchedReviews.find(r => r.uid === auth.currentUser!.uid);
        if (myReview) {
          setUserReview(myReview);
          setRating(myReview.rating);
          setComment(myReview.comment);
        }
      }
      
      setLoading(false);
    }, (error) => {
      console.error('Error fetching reviews:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [recipe.id]);

  const handleSubmitReview = async () => {
    if (!auth.currentUser) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      const userProfile = userDocSnap.exists() ? userDocSnap.data() : null;

      const authorName = userProfile?.displayName || auth.currentUser.displayName || 'Anonymous';
      const authorPhoto = userProfile?.photoUrl || auth.currentUser.photoURL || '';
      const authorCity = userProfile?.city || '';
      const authorCountry = userProfile?.country || '';

      const recipeRef = doc(db, 'community_recipes', recipe.id);
      const reviewRef = doc(db, 'community_recipes', recipe.id, 'reviews', auth.currentUser.uid);

      await runTransaction(db, async (transaction) => {
        const recipeDoc = await transaction.get(recipeRef);
        if (!recipeDoc.exists()) throw new Error("Recipe does not exist!");

        const reviewDoc = await transaction.get(reviewRef);
        const isUpdate = reviewDoc.exists();
        const oldRating = isUpdate ? reviewDoc.data().rating : 0;

        const currentAvg = recipeDoc.data().averageRating || 0;
        const currentCount = recipeDoc.data().reviewCount || 0;

        let newCount = currentCount;
        let newAvg = currentAvg;

        if (isUpdate) {
          const totalScore = (currentAvg * currentCount) - oldRating + rating;
          newAvg = currentCount > 0 ? totalScore / currentCount : rating;
        } else {
          newCount = currentCount + 1;
          const totalScore = (currentAvg * currentCount) + rating;
          newAvg = totalScore / newCount;
        }

        transaction.set(reviewRef, {
          uid: auth.currentUser!.uid,
          authorName,
          authorPhoto,
          ...(authorCity && { authorCity }),
          ...(authorCountry && { authorCountry }),
          rating,
          comment,
          createdAt: isUpdate ? reviewDoc.data().createdAt : serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        transaction.update(recipeRef, {
          averageRating: newAvg,
          reviewCount: newCount
        });

        // Add notification for the author if it's not their own review
        if (recipe.uid !== auth.currentUser!.uid) {
          const notificationRef = doc(collection(db, 'users', recipe.uid, 'notifications'));
          transaction.set(notificationRef, {
            type: 'review',
            recipeId: recipe.id,
            recipeName: recipe.name,
            reviewerName: authorName,
            rating: rating,
            createdAt: serverTimestamp(),
            read: false
          });
        }
      });

    } catch (err) {
      console.error(err);
      setError('評價失敗，請稍後再試。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRecipe = async () => {
    if (!auth.currentUser || auth.currentUser.uid !== recipe.uid) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'community_recipes', recipe.id));
      onBack();
    } catch (err) {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      handleFirestoreError(err, OperationType.DELETE, `community_recipes/${recipe.id}`);
    }
  };

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

  const handleSave = async () => {
    if (!auth.currentUser || isSaved || isSaving) return;
    
    setIsSaving(true);
    try {
      let finalImageUrl = recipe.imageUrl || '';
      if (finalImageUrl) {
        finalImageUrl = await compressImage(finalImageUrl);
      }

      await addDoc(collection(db, 'users', auth.currentUser.uid, 'cocktails'), {
        uid: auth.currentUser.uid,
        name: recipe.name,
        description: recipe.description,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        glassware: recipe.glassware,
        garnish: recipe.garnish,
        visualPrompt: recipe.visualPrompt || '',
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
        
        const canvas = await html2canvas(element, {
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#0f172a',
            logging: false,
            scale: 2,
            width: document.documentElement.scrollWidth,
            height: document.documentElement.scrollHeight,
            windowWidth: document.documentElement.scrollWidth,
            windowHeight: document.documentElement.scrollHeight,
            x: 0,
            y: 0,
            scrollX: 0,
            scrollY: 0,
            onclone: (clonedDoc) => {
                const animatedElements = clonedDoc.querySelectorAll('.animate-slide-up, .animate-fade-in, .animate-fade-in-up, .animate-fade-in-down');
                animatedElements.forEach((el) => {
                    const element = el as HTMLElement;
                    element.style.opacity = '1';
                    element.style.transform = 'none';
                    element.style.animation = 'none';
                    element.style.transition = 'none';
                });

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

  const isAuthor = auth.currentUser?.uid === recipe.uid;

  return (
    <>
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

      <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in-up">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>返回大廳</span>
        </button>
        
        {isAuthor && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              <span className="text-sm font-medium">編輯酒譜</span>
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 hover:text-red-300 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm font-medium">刪除</span>
            </button>
          </div>
        )}
      </div>

      <div className="bg-slate-800/50 border border-white/10 rounded-3xl overflow-hidden shadow-2xl mb-8">
        <div className="md:flex">
          <div className="md:w-1/2 relative bg-slate-900">
            {recipe.imageUrl ? (
              <img 
                src={recipe.imageUrl} 
                alt={recipe.name} 
                className="w-full h-full object-cover min-h-[300px]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full min-h-[300px] flex items-center justify-center text-white/20">
                No Image
              </div>
            )}
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 border border-white/20">
              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              <span className="text-white font-bold text-lg">
                {recipe.averageRating ? recipe.averageRating.toFixed(1) : '0.0'}
              </span>
              <span className="text-white/50 text-sm">({recipe.reviewCount || 0} 則評價)</span>
            </div>
          </div>
          
          <div className="md:w-1/2 p-8">
            <h1 className="text-3xl font-bold text-white mb-2 serif">{recipe.name}</h1>
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-white/10">
              {recipe.authorPhoto ? (
                <img src={recipe.authorPhoto} alt={recipe.authorName} className="w-10 h-10 rounded-full border border-white/20" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-sm text-white font-bold">
                  {recipe.authorName?.charAt(0) || '?'}
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-white/70">由 <span className="text-white font-medium">{recipe.authorName}</span> 分享</span>
                <div className="flex items-center gap-2 text-xs text-white/50">
                  {(recipe.authorCity || recipe.authorCountry) && (
                    <span>
                      {recipe.authorCity}{recipe.authorCity && recipe.authorCountry ? ', ' : ''}{recipe.authorCountry}
                    </span>
                  )}
                  {recipe.updatedAt && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        最後修改: {recipe.updatedAt.toDate().toLocaleDateString()}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <p className="text-white/80 mb-8 leading-relaxed">{recipe.description}</p>

            <div className="space-y-6">
              <div>
                <h3 className="text-pink-400 font-bold uppercase tracking-wider text-sm mb-3">Ingredients</h3>
                <ul className="space-y-2">
                  {recipe.ingredients.map((ing, idx) => (
                    <li key={idx} className="text-white/80 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-500/50" />
                      {ing}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-cyan-400 font-bold uppercase tracking-wider text-sm mb-3">Instructions</h3>
                <ol className="space-y-3">
                  {recipe.instructions.map((step, idx) => (
                    <li key={idx} className="text-white/80 flex gap-3">
                      <span className="text-cyan-500/50 font-mono">{idx + 1}.</span>
                      <span className="flex-1">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex gap-6 pt-4 border-t border-white/10">
                <div>
                  <h3 className="text-white/50 text-xs uppercase tracking-wider mb-1">Glassware</h3>
                  <p className="text-white">{recipe.glassware}</p>
                </div>
                <div>
                  <h3 className="text-white/50 text-xs uppercase tracking-wider mb-1">Garnish</h3>
                  <p className="text-white">{recipe.garnish}</p>
                </div>
              </div>

              {recipe.notes && (
                <div className="pt-4 border-t border-white/10">
                  <h3 className="text-purple-400 font-bold uppercase tracking-wider text-sm mb-2">Notes</h3>
                  <p className="text-white/80 leading-relaxed bg-purple-500/10 p-4 rounded-xl border border-purple-500/20">
                    {recipe.notes}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div data-html2canvas-ignore="true" className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-white/10">
                {auth.currentUser && (
                  <button
                    onClick={handleSave}
                    disabled={isSaving || isSaved}
                    className={`
                      flex-1 py-3 rounded-xl font-bold shadow-lg transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden active:scale-95
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
                      <Bookmark className="w-5 h-5" />
                    )}
                    <span>
                      {isSaving ? '儲存中...' : isSaved ? '已儲存' : '保存酒譜'}
                    </span>
                  </button>
                )}

                <button
                  onClick={handleShare}
                  disabled={isSharing || isShared}
                  className={`
                    flex-1 py-3 rounded-xl font-bold shadow-lg transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden active:scale-95
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
                    <Share2 className="w-5 h-5" />
                  )}
                  <span>
                    {isSharing ? '正在截圖...' : isShared ? '已複製連結' : '分享飲品'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="bg-slate-800/30 border border-white/10 rounded-3xl p-8">
        <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-2 serif">
          <MessageSquare className="w-6 h-6 text-pink-400" />
          社群評價
        </h2>

        {auth.currentUser ? (
          <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 mb-8">
            <h3 className="text-lg font-bold text-white mb-4">
              {userReview ? '修改您的評價' : '撰寫評價'}
            </h3>
            <div className="flex gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star 
                    className={`w-8 h-8 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'}`} 
                  />
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="分享您對這杯調酒的想法..."
              className="w-full bg-slate-800/50 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-pink-500/50 resize-none h-24 mb-4"
              maxLength={1000}
            />
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <button
              onClick={handleSubmitReview}
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 shadow-lg shadow-purple-500/25 flex items-center gap-2 transition-all active:scale-95"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              <span>{userReview ? '更新評價' : '送出評價'}</span>
            </button>
          </div>
        ) : (
          <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 mb-8 text-center">
            <p className="text-white/70">請先登入以留下您的評價。</p>
          </div>
        )}

        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
            </div>
          ) : reviews.length === 0 ? (
            <p className="text-center text-white/50 py-8">目前還沒有評價，成為第一個評論的人吧！</p>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="bg-white/5 border border-white/5 rounded-2xl p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    {review.authorPhoto ? (
                      <img src={review.authorPhoto} alt={review.authorName} className="w-10 h-10 rounded-full border border-white/10" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-sm text-white font-bold">
                        {review.authorName?.charAt(0) || '?'}
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-white">{review.authorName}</div>
                      <div className="text-xs text-white/40 flex items-center gap-2">
                        <span>{review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString() : '剛剛'}</span>
                        {(review.authorCity || review.authorCountry) && (
                          <>
                            <span>•</span>
                            <span>{review.authorCity}{review.authorCity && review.authorCountry ? ', ' : ''}{review.authorCountry}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star}
                        className={`w-4 h-4 ${star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-700'}`} 
                      />
                    ))}
                  </div>
                </div>
                {review.comment && (
                  <p className="text-white/80 leading-relaxed bg-black/20 p-4 rounded-xl">
                    {review.comment}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      
      {isEditing && (
        <EditRecipeModal
          recipe={recipe}
          onClose={() => setIsEditing(false)}
          onSuccess={() => {
            setIsEditing(false);
          }}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-fade-in-up">
            <h3 className="text-xl font-bold text-white mb-4">確認刪除</h3>
            <p className="text-white/70 mb-6">您確定要從社群大廳移除這份酒譜嗎？此動作無法復原。</p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-xl font-medium text-white bg-white/10 hover:bg-white/20 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDeleteRecipe}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : '確認刪除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};
