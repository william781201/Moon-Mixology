import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { SavedCocktail } from '../types';
import { Trash2, Loader2, Image as ImageIcon, Plus } from 'lucide-react';
import CocktailDisplay from './CocktailDisplay';
import { CreateRecipeModal } from './CreateRecipeModal';

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

export const Gallery: React.FC = () => {
  const [cocktails, setCocktails] = useState<SavedCocktail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCocktail, setSelectedCocktail] = useState<SavedCocktail | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const q = query(
          collection(db, 'users', user.uid, 'cocktails'),
          orderBy('createdAt', 'desc')
        );
        
        const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const fetchedCocktails = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as SavedCocktail[];
          setCocktails(fetchedCocktails);
          setLoading(false);
        }, (error) => {
          setLoading(false);
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}/cocktails`);
        });

        return () => unsubscribeSnapshot();
      } else {
        setCocktails([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!auth.currentUser) return;
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'cocktails', id));
      if (selectedCocktail?.id === id) {
        setSelectedCocktail(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${auth.currentUser.uid}/cocktails/${id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
      </div>
    );
  }

  if (!auth.currentUser) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p>請先登入以檢視您儲存的調酒配方。</p>
      </div>
    );
  }

  if (selectedCocktail) {
    return (
      <div className="mt-8">
        <CocktailDisplay 
          cocktail={selectedCocktail} 
          onBack={() => setSelectedCocktail(null)} 
        />
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white serif">我的酒譜</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-purple-500/25 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>創造酒譜</span>
        </button>
      </div>

      {cocktails.length === 0 ? (
        <div className="text-center py-12 text-slate-500 bg-slate-800/30 rounded-3xl border border-white/5">
          <p>您還沒有儲存任何調酒配方。</p>
          <p className="mt-2 text-sm">點擊右上角的「創造酒譜」來新增您的第一杯特調吧！</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cocktails.map((cocktail) => (
            <div 
              key={cocktail.id} 
              className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden group relative cursor-pointer hover:border-pink-500/50 transition-colors"
              onClick={() => setSelectedCocktail(cocktail)}
            >
              <div className="aspect-[4/3] bg-slate-900 relative overflow-hidden">
                {cocktail.imageUrl ? (
                  <img 
                    src={cocktail.imageUrl} 
                    alt={cocktail.name} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-700">
                    <ImageIcon className="w-12 h-12" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
                <div className="absolute bottom-0 left-0 p-4 w-full">
                  <h3 className="text-xl font-bold text-white mb-1 serif">{cocktail.name}</h3>
                  <p className="text-xs text-slate-300 line-clamp-2">{cocktail.description}</p>
                </div>
              </div>
              <div className="p-4">
                <h4 className="text-xs uppercase tracking-wider text-pink-400 mb-2">Ingredients</h4>
                <ul className="text-sm text-slate-300 space-y-1 mb-4">
                  {cocktail.ingredients.slice(0, 3).map((ing, idx) => (
                    <li key={idx} className="truncate">• {ing}</li>
                  ))}
                  {cocktail.ingredients.length > 3 && (
                    <li className="text-slate-500 italic">...and {cocktail.ingredients.length - 3} more</li>
                  )}
                </ul>
                <button
                  onClick={(e) => handleDelete(cocktail.id, e)}
                  className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-red-500/80 rounded-full text-white/70 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isCreating && (
        <CreateRecipeModal
          onClose={() => setIsCreating(false)}
          onSuccess={() => setIsCreating(false)}
        />
      )}
    </div>
  );
};
