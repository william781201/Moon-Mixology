
import React, { useState, useEffect } from 'react';
import { GeneratedCocktail, UserSelections, Step } from './types';
import { generateCocktailRecipe, generateCocktailImage } from './services/geminiService';
import SelectionPanel from './components/SelectionPanel';
import CocktailDisplay from './components/CocktailDisplay';
import LoadingScreen from './components/LoadingScreen';
import { AuthButton } from './components/AuthButton';
import { Gallery } from './components/Gallery';
import { CommunityFeed } from './components/CommunityFeed';
import { Martini, Sparkles, BookOpen, Users, Key } from 'lucide-react';
import { auth, db } from './firebase';
import { doc, getDocFromServer } from 'firebase/firestore';
import { APP_VERSION } from './constants';

const App: React.FC = () => {
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();

    const checkKey = async () => {
      // @ts-ignore
      if (window.aistudio) {
        // @ts-ignore
        if (await window.aistudio.hasSelectedApiKey()) {
          setHasKey(true);
        }
      } else if (process.env.GEMINI_API_KEY) {
        setHasKey(true);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    // @ts-ignore
    if (window.aistudio) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  const [activeTab, setActiveTab] = useState<'create' | 'gallery' | 'community'>('create');
  const [step, setStep] = useState<Step>(Step.SELECTION);
  const [selections, setSelections] = useState<UserSelections>({
    ingredients: [],
    mood: '',
    flavor: '',
    visualStyle: 'studio',
    glassType: '',
    icePreference: '',
    isNonAlcoholic: false,
    isCVS: false,
  });
  const [cocktail, setCocktail] = useState<GeneratedCocktail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setStep(Step.GENERATING);
    setError(null);
    try {
      const recipe = await generateCocktailRecipe(selections);
      const imageUrl = await generateCocktailImage(recipe.visualPrompt, selections.visualStyle);
      setCocktail({ ...recipe, imageUrl });
      setStep(Step.RESULT);
    } catch (err) {
      console.error(err);
      setError("調酒師忙不過來了，請再試一次。");
      setStep(Step.SELECTION);
    }
  };

  const handleReset = () => {
    setStep(Step.SELECTION);
    setCocktail(null);
    setSelections({
      ingredients: [],
      mood: '',
      flavor: '',
      visualStyle: 'studio',
      glassType: '',
      icePreference: '',
      isNonAlcoholic: false,
      isCVS: false,
    });
  };

  if (!hasKey) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-100 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 border border-white/10 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Key className="w-8 h-8 text-pink-400" />
          </div>
          <h1 className="text-2xl font-bold mb-4 serif">需要 API Key</h1>
          <p className="text-slate-400 mb-8 leading-relaxed">
            為了提供更快速、更高品質的調酒圖片生成體驗，我們升級了 AI 模型。請選擇您的 Gemini API Key 以繼續使用。
          </p>
          <button 
            onClick={handleSelectKey}
            className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 rounded-xl font-bold text-white shadow-lg shadow-pink-500/25 transition-all active:scale-95"
          >
            選擇 API Key
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 selection:bg-pink-500/30 overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-900/10 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-900/10 blur-[150px] rounded-full"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex justify-end mb-4">
          <AuthButton />
        </div>
        
        <header className="text-center mb-10">
          <div className="inline-flex items-center px-4 py-1.5 bg-white/5 border border-white/10 rounded-full mb-6">
            <Martini className="w-4 h-4 text-pink-500 mr-2" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">AI Mixology Experience</span>
          </div>
          <h1 className="text-4xl md:text-7xl font-bold mb-4 serif bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent">
            Mood Mixology
          </h1>
          <p className="text-slate-400 max-w-md mx-auto text-sm font-light leading-relaxed">
            這不是一般的酒單，是為您的當下量身定做的靈魂特調。
          </p>
        </header>

        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white/5 p-1 rounded-2xl border border-white/10 flex-wrap justify-center gap-1">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                activeTab === 'create' 
                  ? 'bg-pink-500/20 text-pink-300 shadow-lg shadow-pink-500/10' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">調製新酒</span>
              <span className="sm:hidden">調製</span>
            </button>
            <button
              onClick={() => setActiveTab('gallery')}
              className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                activeTab === 'gallery' 
                  ? 'bg-cyan-500/20 text-cyan-300 shadow-lg shadow-cyan-500/10' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">我的酒譜</span>
              <span className="sm:hidden">酒譜</span>
            </button>
            <button
              onClick={() => setActiveTab('community')}
              className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                activeTab === 'community' 
                  ? 'bg-purple-500/20 text-purple-300 shadow-lg shadow-purple-500/10' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">社群大廳</span>
              <span className="sm:hidden">大廳</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-center text-sm">
            {error}
          </div>
        )}

        {activeTab === 'create' && (
          <>
            {step === Step.SELECTION && <SelectionPanel selections={selections} setSelections={setSelections} onGenerate={handleGenerate} />}
            {step === Step.GENERATING && <LoadingScreen />}
            {step === Step.RESULT && cocktail && <CocktailDisplay cocktail={cocktail} onReset={handleReset} />}
          </>
        )}
        {activeTab === 'gallery' && <Gallery />}
        {activeTab === 'community' && <CommunityFeed />}
        
        <div className="fixed bottom-4 left-4 text-[10px] text-slate-600">
          {APP_VERSION}
        </div>
      </div>
    </div>
  );
};

export default App;
