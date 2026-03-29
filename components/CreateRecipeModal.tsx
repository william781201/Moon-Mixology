import React, { useState, useRef } from 'react';
import { auth, db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { X, Loader2, Plus, Trash2, Upload, Image as ImageIcon } from 'lucide-react';

interface CreateRecipeModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateRecipeModal: React.FC<CreateRecipeModalProps> = ({ onClose, onSuccess }) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string>('');

  const [recipe, setRecipe] = useState({
    name: '',
    description: '',
    ingredients: [''],
    instructions: [''],
    glassware: '',
    garnish: '',
  });

  const handleRecipeChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRecipe(prev => ({ ...prev, [name]: value }));
  };

  const handleIngredientChange = (index: number, value: string) => {
    const newIngredients = [...recipe.ingredients];
    newIngredients[index] = value;
    setRecipe(prev => ({ ...prev, ingredients: newIngredients }));
  };

  const addIngredient = () => {
    setRecipe(prev => ({ ...prev, ingredients: [...prev.ingredients, ''] }));
  };

  const removeIngredient = (index: number) => {
    setRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  const handleInstructionChange = (index: number, value: string) => {
    const newInstructions = [...recipe.instructions];
    newInstructions[index] = value;
    setRecipe(prev => ({ ...prev, instructions: newInstructions }));
  };

  const addInstruction = () => {
    setRecipe(prev => ({ ...prev, instructions: [...prev.instructions, ''] }));
  };

  const removeInstruction = (index: number) => {
    setRecipe(prev => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index)
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('圖片大小不能超過 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 512;
        const MAX_HEIGHT = 512;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setImageUrl(compressedDataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;
    
    const finalIngredients = recipe.ingredients.map(i => i.trim()).filter(i => i);
    const finalInstructions = recipe.instructions.map(i => i.trim()).filter(i => i);

    if (!recipe.name.trim() || finalIngredients.length === 0 || finalInstructions.length === 0) {
      setError('請填寫品名、至少一項材料與步驟。');
      return;
    }

    setIsPublishing(true);
    setError(null);

    try {
      const cocktailsRef = collection(db, 'users', auth.currentUser.uid, 'cocktails');

      await addDoc(cocktailsRef, {
        uid: auth.currentUser.uid,
        name: recipe.name,
        description: recipe.description,
        ingredients: finalIngredients,
        instructions: finalInstructions,
        glassware: recipe.glassware,
        garnish: recipe.garnish,
        visualPrompt: '', // Empty visual prompt for custom recipes
        imageUrl: imageUrl || '',
        createdAt: serverTimestamp()
      });

      onSuccess();
    } catch (err) {
      console.error(err);
      setError('儲存失敗，請稍後再試。');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up">
        <div className="sticky top-0 bg-slate-800/95 backdrop-blur-md p-6 border-b border-white/10 flex justify-between items-center z-10">
          <h3 className="text-xl font-bold text-white">創造我的酒譜</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="flex flex-col items-center gap-4 mb-6">
            <div 
              className="w-40 h-40 rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center bg-slate-900/50 overflow-hidden relative group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              {imageUrl ? (
                <>
                  <img src={imageUrl} alt="Recipe" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                </>
              ) : (
                <>
                  <ImageIcon className="w-8 h-8 text-white/30 mb-2" />
                  <span className="text-sm text-white/50">上傳圖片</span>
                </>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
            <p className="text-xs text-white/40">建議尺寸: 512x512, 最大 2MB</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">品名</label>
              <input
                type="text"
                name="name"
                value={recipe.name}
                onChange={handleRecipeChange}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-pink-500/50"
                placeholder="例如：夏日微風"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">說明</label>
              <textarea
                name="description"
                value={recipe.description}
                onChange={handleRecipeChange}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-pink-500/50 resize-none h-20"
                placeholder="簡單描述這杯調酒的特色..."
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">所需材料</label>
              <div className="space-y-2">
                {recipe.ingredients.map((ing, idx) => (
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
                {recipe.instructions.map((inst, idx) => (
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
                  value={recipe.glassware}
                  onChange={handleRecipeChange}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-pink-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">裝飾</label>
                <input
                  type="text"
                  name="garnish"
                  value={recipe.garnish}
                  onChange={handleRecipeChange}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-pink-500/50"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          <button
            onClick={handleSave}
            disabled={isPublishing}
            className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>儲存中...</span>
              </>
            ) : (
              <span>儲存至我的酒譜</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
