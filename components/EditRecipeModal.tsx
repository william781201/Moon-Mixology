import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { CommunityRecipe } from '../types';
import { X, Loader2, Plus, Trash2 } from 'lucide-react';

interface EditRecipeModalProps {
  recipe: CommunityRecipe;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditRecipeModal: React.FC<EditRecipeModalProps> = ({ recipe, onClose, onSuccess }) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editedRecipe, setEditedRecipe] = useState({
    name: recipe.name,
    description: recipe.description,
    ingredients: [...recipe.ingredients],
    instructions: [...recipe.instructions],
    glassware: recipe.glassware,
    garnish: recipe.garnish,
    notes: recipe.notes || ''
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

  const handleUpdate = async () => {
    if (!auth.currentUser || auth.currentUser.uid !== recipe.uid) return;
    
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
      const recipeRef = doc(db, 'community_recipes', recipe.id);

      await updateDoc(recipeRef, {
        name: editedRecipe.name,
        description: editedRecipe.description,
        ingredients: finalIngredients,
        instructions: finalInstructions,
        glassware: editedRecipe.glassware,
        garnish: editedRecipe.garnish,
        notes: editedRecipe.notes || null,
        updatedAt: serverTimestamp()
      });

      onSuccess();
    } catch (err) {
      console.error(err);
      setError('更新失敗，請稍後再試。');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up">
        <div className="sticky top-0 bg-slate-800/95 backdrop-blur-md p-6 border-b border-white/10 flex justify-between items-center z-10">
          <h3 className="text-xl font-bold text-white">編輯酒譜</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">品名</label>
              <input
                type="text"
                name="name"
                value={editedRecipe.name}
                onChange={handleRecipeChange}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-pink-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">說明</label>
              <textarea
                name="description"
                value={editedRecipe.description}
                onChange={handleRecipeChange}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-pink-500/50 resize-none h-20"
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
                      className="flex-1 bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-pink-500/50"
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
                      className="flex-1 bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-pink-500/50 resize-none h-16"
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
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-pink-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">裝飾</label>
                <input
                  type="text"
                  name="garnish"
                  value={editedRecipe.garnish}
                  onChange={handleRecipeChange}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-pink-500/50"
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
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-pink-500/50 resize-none h-20"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          <button
            onClick={handleUpdate}
            disabled={isPublishing}
            className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>更新中...</span>
              </>
            ) : (
              <span>儲存修改</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
