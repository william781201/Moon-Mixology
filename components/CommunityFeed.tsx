import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { CommunityRecipe } from '../types';
import { Loader2, Star, Users, MessageSquare } from 'lucide-react';
import { CommunityRecipeDetail } from './CommunityRecipeDetail';

export const CommunityFeed: React.FC = () => {
  const [recipes, setRecipes] = useState<CommunityRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'newest' | 'top'>('newest');
  const [selectedRecipe, setSelectedRecipe] = useState<CommunityRecipe | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'community_recipes'),
      orderBy(sortBy === 'newest' ? 'createdAt' : 'averageRating', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRecipes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CommunityRecipe[];
      
      setRecipes(fetchedRecipes);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching community recipes:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [sortBy]);

  if (selectedRecipe) {
    return (
      <CommunityRecipeDetail 
        recipe={selectedRecipe} 
        onBack={() => setSelectedRecipe(null)} 
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-white serif">社群酒譜大廳</h2>
        <div className="flex gap-2 bg-slate-800/50 p-1 rounded-lg border border-white/10">
          <button
            onClick={() => setSortBy('newest')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              sortBy === 'newest' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
            }`}
          >
            最新上傳
          </button>
          <button
            onClick={() => setSortBy('top')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              sortBy === 'top' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
            }`}
          >
            最高評分
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-20 text-white/50">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>目前還沒有人分享酒譜，趕快成為第一位吧！</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <div 
              key={recipe.id}
              onClick={() => setSelectedRecipe(recipe)}
              className="bg-slate-800/40 border border-white/10 rounded-2xl overflow-hidden cursor-pointer hover:border-pink-500/50 transition-all group hover:-translate-y-1 hover:shadow-xl hover:shadow-pink-500/10"
            >
              <div className="aspect-[4/3] relative overflow-hidden bg-slate-900">
                {recipe.imageUrl ? (
                  <img 
                    src={recipe.imageUrl} 
                    alt={recipe.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20">
                    No Image
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent opacity-80" />
                
                <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/10">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-white font-bold text-sm">
                    {recipe.averageRating ? recipe.averageRating.toFixed(1) : '0.0'}
                  </span>
                  <span className="text-white/50 text-xs ml-1">({recipe.reviewCount || 0})</span>
                </div>

                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-xl font-bold text-white mb-2 line-clamp-1 serif">{recipe.name}</h3>
                  <div className="flex items-center gap-2">
                    {recipe.authorPhoto ? (
                      <img src={recipe.authorPhoto} alt={recipe.authorName} className="w-6 h-6 rounded-full border border-white/20" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-[10px] text-white font-bold">
                        {recipe.authorName?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-sm text-white/90 truncate">{recipe.authorName}</span>
                      {(recipe.authorCity || recipe.authorCountry) && (
                        <span className="text-[10px] text-white/50 truncate">
                          {recipe.authorCity}{recipe.authorCity && recipe.authorCountry ? ', ' : ''}{recipe.authorCountry}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-5">
                <p className="text-sm text-white/60 line-clamp-2 mb-4 h-10">
                  {recipe.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {recipe.ingredients.slice(0, 3).map((ing, idx) => (
                    <span key={idx} className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-white/70 border border-white/5">
                      {ing}
                    </span>
                  ))}
                  {recipe.ingredients.length > 3 && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-white/40 border border-white/5">
                      +{recipe.ingredients.length - 3}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
