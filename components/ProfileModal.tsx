import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { X, Loader2, User as UserIcon, Upload } from 'lucide-react';
import { UserProfile } from '../types';

interface ProfileModalProps {
  onClose: () => void;
}

const createEmojiAvatar = (emoji: string) => `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${emoji}</text></svg>`;

const PRESET_HUMANS = ['👨‍🍳', '👩‍🎤', '🦸‍♂️', '🥷', '🧙‍♀️'].map(createEmojiAvatar);
const PRESET_ANIMALS = ['🐶', '🐱', '🐰', '🦊', '🐼'].map(createEmojiAvatar);

export const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!auth.currentUser) return;
      try {
        const docRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("無法載入個人資料");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (e.g., max 2MB before compression)
    if (file.size > 2 * 1024 * 1024) {
      setError("圖片檔案過大，請選擇小於 2MB 的圖片。");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 200;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.8);
        setProfile(prev => ({ ...prev, photoUrl: compressed }));
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    setError(null);
    try {
      const docRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(docRef, {
        displayName: profile.displayName || '',
        photoUrl: profile.photoUrl || '',
        city: profile.city || '',
        country: profile.country || '',
        updatedAt: serverTimestamp()
      });
      onClose();
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("儲存失敗，請稍後再試");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center mb-6">
          <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center mr-3">
            <UserIcon className="w-5 h-5 text-pink-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">編輯個人資料</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}
            
            <div className="flex flex-col items-center">
              <div className="relative mb-4 group">
                {profile.photoUrl ? (
                  <img src={profile.photoUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-slate-800" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center border-4 border-slate-700">
                    <UserIcon className="w-10 h-10 text-slate-500" />
                  </div>
                )}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Upload className="w-6 h-6 text-white" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
              
              <div className="w-full space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">可愛人物</label>
                  <div className="flex justify-center gap-2">
                    {PRESET_HUMANS.map((avatar, idx) => (
                      <button 
                        key={`human-${idx}`}
                        onClick={() => setProfile(prev => ({ ...prev, photoUrl: avatar }))}
                        className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all ${profile.photoUrl === avatar ? 'border-pink-500 scale-110' : 'border-transparent hover:border-slate-600'}`}
                      >
                        <img src={avatar} alt={`Human ${idx}`} className="w-full h-full object-cover bg-slate-800" />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">可愛動物</label>
                  <div className="flex justify-center gap-2">
                    {PRESET_ANIMALS.map((avatar, idx) => (
                      <button 
                        key={`animal-${idx}`}
                        onClick={() => setProfile(prev => ({ ...prev, photoUrl: avatar }))}
                        className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all ${profile.photoUrl === avatar ? 'border-pink-500 scale-110' : 'border-transparent hover:border-slate-600'}`}
                      >
                        <img src={avatar} alt={`Animal ${idx}`} className="w-full h-full object-cover bg-slate-800" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">顯示名稱</label>
              <input
                type="text"
                name="displayName"
                value={profile.displayName || ''}
                onChange={handleChange}
                placeholder="例如：調酒大師"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">城市</label>
                <input
                  type="text"
                  name="city"
                  value={profile.city || ''}
                  onChange={handleChange}
                  placeholder="例如：台北"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">國家</label>
                <input
                  type="text"
                  name="country"
                  value={profile.country || ''}
                  onChange={handleChange}
                  placeholder="例如：台灣"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all"
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 text-white rounded-xl font-medium transition-all shadow-lg shadow-pink-500/25 disabled:opacity-50 flex justify-center items-center"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : '儲存設定'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
