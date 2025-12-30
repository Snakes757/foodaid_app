import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User } from '@/types/api';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/app/config/firebase';
import { getUserProfile } from '@/api/auth';
import { SplashScreen } from 'expo-router';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const userProfile = await getUserProfile();
      setUser(userProfile);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      setUser(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setFirebaseUser(currentUser);
      
      if (currentUser) {
        await fetchProfile();
      } else {
        setUser(null);
      }
      
      setIsLoading(false);
      SplashScreen.hideAsync();
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (firebaseUser) {
      await fetchProfile();
    }
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, isLoading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};