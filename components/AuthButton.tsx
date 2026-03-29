import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { LogIn, LogOut, Loader2, User as UserIcon } from 'lucide-react';
import { ProfileModal } from './ProfileModal';

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

export const AuthButton: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (!userDoc.exists()) {
            await setDoc(userDocRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName || '',
              photoUrl: currentUser.photoURL || '',
              createdAt: serverTimestamp()
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}`);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) {
    return (
      <button className="flex items-center px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-slate-300">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        載入中...
      </button>
    );
  }

  if (user) {
    return (
      <>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <span className="text-sm text-slate-400 hidden sm:inline-block">{user.email}</span>
          <button 
            onClick={() => setShowProfileModal(true)}
            className="flex items-center px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm text-slate-300 transition-colors"
          >
            <UserIcon className="w-4 h-4 mr-2" />
            個人資料
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm text-slate-300 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            登出
          </button>
        </div>
        {showProfileModal && <ProfileModal onClose={() => setShowProfileModal(false)} />}
      </>
    );
  }

  return (
    <button 
      onClick={handleLogin}
      className="flex items-center px-4 py-2 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/50 rounded-full text-sm text-pink-300 transition-colors"
    >
      <LogIn className="w-4 h-4 mr-2" />
      Google 登入
    </button>
  );
};
