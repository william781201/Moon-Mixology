import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { collection, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { GeneratedCocktail, SavedCocktail } from '../types';
import { X, Loader2, Edit3, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';

interface PublishModalProps {
  cocktail: GeneratedCocktail | SavedCocktail;
  onClose: () => void;
  onSuccess: () => void;
}

export const PublishModal: React.FC<PublishModalProps> = ({ cocktail, onClose, onSuccess }) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditingRecipe, setIsEditingRecipe] = useState(false);

  const [editedRecipe, setEditedRecipe] = useState({
    name: cocktail.name,
    description: cocktail.description,
    ingredients: [...cocktail.ingredients],
    instructions: [...cocktail.instructions],
    glassware: cocktail.glassware,
    garnish: cocktail.garnish,
    notes: ''
  });

  const handleRecipeChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedRecipe(prev => ({ ...prev, [name]: value }));
  };

  const handleIngredientChange = (index: number, value: string) => {
    const newIngredients = [...editedRecipe.ingredients];
    newIngredients[index] = value;
    setEditedRecipe(prev => ({ ...prev, ingredients: newIngredients }));
  };

  const addIngredient = () => {
    setEditedRecipe(prev => ({ ...prev, ingredients: [...prev.ingredients, ''] }));
  };

  const removeIngredient = (index: number) => {
    setEditedRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  const handleInstructionChange = (index: number, value: string) => {
    const newInstructions = [...editedRecipe.instructions];
    newInstructions[index] = value;
    setEditedRecipe(prev => ({ ...prev, instructions: newInstructions }));
  };

  const addInstruction = () => {
    setEditedRecipe(prev => ({ ...prev, instructions: [...prev.instructions, ''] }));
  };

  const removeInstruction = (index: number) => {
    setEditedRecipe(prev => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index)
    }));
  };

  const handlePublish = async () => {
    if (!auth.currentUser) return;
    
    // Validate
    const finalIngredients = editedRecipe.ingredients.map(i => i.trim()).filter(i => i);
    const finalInstructions = editedRecipe.instructions.map(i => i.trim()).filter(i => i);

    if (!editedRecipe.name.trim() || finalIngredients.length === 0 || finalInstructions.length === 0) {
      setError('請填寫品名、至少一項材料與步驟。');
      return;
    }

    setIsPublishing(true);
    setError(null);

    try {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      const userProfile = userDocSnap.exists() ? userDocSnap.data() : null;

      const authorName = userProfile?.displayName || auth.currentUser.displayName || 'Anonymous';
      const authorPhoto = userProfile?.photoUrl || auth.currentUser.photoURL || '';
      const authorCity = userProfile?.city || '';
      const authorCountry = userProfile?.country || '';

      const recipeRef = doc(collection(db, 'community_recipes'));

      await setDoc(recipeRef, {
        uid: auth.currentUser!.uid,
        authorName,
        authorPhoto,
        ...(authorCity && { authorCity }),
        ...(authorCountry && { authorCountry }),
        name: editedRecipe.name,
        description: editedRecipe.description,
        ingredients: finalIngredients,
        instructions: finalInstructions,
        glassware: editedRecipe.glassware,
        garnish: editedRecipe.garnish,
        ...(editedRecipe.notes && { notes: editedRecipe.notes }),
        visualPrompt: cocktail.visualPrompt || '',
        imageUrl: cocktail.imageUrl || '',
        averageRating: 0,
        reviewCount: 0,
        createdAt: serverTimestamp()
      });

      onSuccess();
    } catch (err) {
      console.error(err);
      setError('發布失敗，請稍後再試。');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up">
        <div className="sticky top-0 bg-slate-800/95 backdrop-blur-md p-6 border-b border-white/10 flex justify-between items-center z-10">
          <h3 className="text-xl font-bold text-white">發布至社群</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="bg-slate-900/50 rounded-2xl p-4 border border-white/5">
            <button 
              onClick={() => setIsEditingRecipe(!isEditingRecipe)}
              className="w-full flex items-center justify-between text-white font-medium hover:text-pink-400 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5" />
                <span>客製化酒譜內容 (選填)</span>
              </div>
              {isEditingRecipe ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            
            {isEditingRecipe && (
              <div className="mt-6 space-y-6 animate-fade-in">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">品名</label>
                  <input
                    type="text"
                    name="name"
                    value={editedRecipe.name}
                    onChange={handleRecipeChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-pink-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">說明</label>
                  <textarea
                    name="description"
                    value={editedRecipe.description}
                    onChange={handleRecipeChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-pink-500/50 resize-none h-20"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">所需材料</label>
                  <div className="space-y-2">
                    {editedRecipe.ingredients.map((ing, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={ing}
                          onChange={(e) => handleIngredientChange(idx, e.target.value)}
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-pink-500/50"
                          placeholder={`材料 ${idx + 1}`}
                        />
                        <button
                          onClick={() => removeIngredient(idx)}
                          className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addIngredient}
                    className="mt-2 flex items-center gap-1 text-sm text-pink-400 hover:text-pink-300 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> 新增材料
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">步驟</label>
                  <div className="space-y-2">
                    {editedRecipe.instructions.map((inst, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-slate-500 mt-2 text-sm">{idx + 1}.</span>
                        <textarea
                          value={inst}
                          onChange={(e) => handleInstructionChange(idx, e.target.value)}
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-pink-500/50 resize-none h-16"
                          placeholder={`步驟 ${idx + 1}`}
                        />
                        <button
                          onClick={() => removeInstruction(idx)}
                          className="p-2 text-slate-400 hover:text-red-400 transition-colors mt-2"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addInstruction}
                    className="mt-2 flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> 新增步驟
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">杯具</label>
                    <input
                      type="text"
                      name="glassware"
                      value={editedRecipe.glassware}
                      onChange={handleRecipeChange}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-pink-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">裝飾</label>
                    <input
                      type="text"
                      name="garnish"
                      value={editedRecipe.garnish}
                      onChange={handleRecipeChange}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-pink-500/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">備註 (選填)</label>
                  <textarea
                    name="notes"
                    value={editedRecipe.notes}
                    onChange={handleRecipeChange}
                    placeholder="例如：可以將檸檬汁替換成萊姆汁..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-pink-500/50 resize-none h-20"
                  />
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>發布中...</span>
              </>
            ) : (
              <span>確認發布</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
