
import React from 'react';
import { MOODS, FLAVORS, INGREDIENTS, VISUAL_STYLES, GLASSWARE, ICE_TYPES } from '../constants';
import { UserSelections } from '../types';
import { Sparkles, RotateCcw, WineOff, Store, CupSoda, Snowflake } from 'lucide-react';

interface SelectionPanelProps {
  selections: UserSelections;
  setSelections: React.Dispatch<React.SetStateAction<UserSelections>>;
  onGenerate: () => void;
}

const SelectionPanel: React.FC<SelectionPanelProps> = ({ selections, setSelections, onGenerate }) => {
  
  const toggleIngredient = (id: string) => {
    setSelections(prev => {
      const exists = prev.ingredients.includes(id);
      return exists 
        ? { ...prev, ingredients: prev.ingredients.filter(i => i !== id) }
        : { ...prev, ingredients: [...prev.ingredients, id] };
    });
  };

  const handleSelect = (field: keyof UserSelections, value: string) => {
    setSelections(prev => ({ ...prev, [field]: prev[field] === value ? '' : value }));
  };

  const handleClear = () => {
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

  const isReady = selections.mood || selections.flavor || selections.ingredients.length > 0;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in pb-32">
      
      <div className="flex flex-wrap items-center justify-between gap-4 px-2">
        <div className="flex gap-3">
            <button
              onClick={() => setSelections(p => ({...p, isNonAlcoholic: !p.isNonAlcoholic}))}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${selections.isNonAlcoholic ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200' : 'bg-slate-800/50 border-slate-700 text-slate-400'}`}
            >
              <WineOff className="w-4 h-4" />
              <span className="text-sm">無酒精</span>
            </button>
            <button
              onClick={() => setSelections(p => ({...p, isCVS: !p.isCVS}))}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${selections.isCVS ? 'bg-orange-600/30 border-orange-500 text-orange-200' : 'bg-slate-800/50 border-slate-700 text-slate-400'}`}
            >
              <Store className="w-4 h-4" />
              <span className="text-sm">超商材料</span>
            </button>
        </div>
        <button onClick={handleClear} className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-sm">
          <RotateCcw className="w-4 h-4" /> 重置
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <Section title="1. 你的心情" color="text-pink-400">
            <div className="grid grid-cols-4 gap-2">
              {MOODS.map(m => (
                <ItemButton key={m.id} item={m} selected={selections.mood === m.id} onClick={() => handleSelect('mood', m.id)} />
              ))}
            </div>
          </Section>

          <Section title="2. 偏好口味" color="text-cyan-400">
            <div className="grid grid-cols-4 gap-2">
              {FLAVORS.map(f => (
                <ItemButton key={f.id} item={f} selected={selections.flavor === f.id} onClick={() => handleSelect('flavor', f.id)} />
              ))}
            </div>
          </Section>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <Section title="3. 選擇杯型與冰塊" color="text-amber-400">
             <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-widest mb-2"><CupSoda className="w-3 h-3"/> 杯型</div>
                <div className="grid grid-cols-3 gap-2">
                  {GLASSWARE.map(g => (
                    <ItemButton key={g.id} item={g} selected={selections.glassType === g.id} onClick={() => handleSelect('glassType', g.id)} small />
                  ))}
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-widest mt-4 mb-2"><Snowflake className="w-3 h-3"/> 冰塊</div>
                <div className="grid grid-cols-4 gap-2">
                  {ICE_TYPES.map(i => (
                    <ItemButton key={i.id} item={i} selected={selections.icePreference === i.id} onClick={() => handleSelect('icePreference', i.id)} small />
                  ))}
                </div>
             </div>
          </Section>
        </div>
      </div>

      <Section title="4. 選擇基底與材料" color="text-purple-400">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {INGREDIENTS.map(i => (
            <ItemButton key={i.id} item={i} selected={selections.ingredients.includes(i.label)} onClick={() => toggleIngredient(i.label)} small />
          ))}
        </div>
      </Section>

      <Section title="5. 視覺呈現風格" color="text-emerald-400">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {VISUAL_STYLES.map(s => (
            <ItemButton key={s.id} item={s} selected={selections.visualStyle === s.id} onClick={() => handleSelect('visualStyle', s.id)} small />
          ))}
        </div>
      </Section>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-slate-900/80 backdrop-blur-xl border-t border-white/10 z-50">
        <button
          onClick={onGenerate}
          disabled={!isReady}
          className={`w-full max-w-lg mx-auto block py-4 rounded-full text-xl font-bold shadow-2xl transition-all active:scale-95 ${isReady ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white' : 'bg-slate-800 text-slate-600'}`}
        >
          {isReady ? <span className="flex items-center justify-center gap-2"><Sparkles className="animate-pulse" /> 開始調製</span> : "選擇您的心情與口味"}
        </button>
      </div>
    </div>
  );
};

const Section = ({ title, color, children }: { title: string, color: string, children: React.ReactNode }) => (
  <section className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 shadow-xl">
    <h2 className={`text-xl font-bold mb-4 serif ${color}`}>{title}</h2>
    {children}
  </section>
);

const ItemButton = ({ item, selected, onClick, small }: { item: any, selected: boolean, onClick: () => void, small?: boolean }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-1 rounded-2xl transition-all duration-300 border w-full ${small ? 'p-2' : 'p-3'} ${selected ? 'bg-white/20 border-white/40 shadow-lg scale-105' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
  >
    <span className={small ? "text-xl" : "text-2xl"}>{item.emoji}</span>
    <span className={`font-medium ${small ? 'text-[10px]' : 'text-xs'} whitespace-nowrap`}>{item.label}</span>
  </button>
);

export default SelectionPanel;
