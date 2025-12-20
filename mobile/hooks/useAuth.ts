
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User } from '@/types/api';
import { SplashScreen } from 'expo-router';
// You'll need an async-storage library
// import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_KEY = 'foodaid-user';
const TOKEN_KEY = 'foodaid-token';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load user and token from storage on app startup
    const loadAuthState = async () => {
      try {
        // const storedUser = await AsyncStorage.getItem(USER_KEY);
        // const storedToken = await AsyncStorage.getItem(TOKEN_KEY);

        // --- FAKE DELAY FOR DEMO ---
        await new Promise(resolve => setTimeout(resolve, 1000));
        const storedUser = null; // Replace with async storage
        const storedToken = null; // Replace with async storage
        // --- END FAKE DELAY ---

        if (storedUser && storedToken) {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
          // TODO: Set axios default auth header
        }
      } catch (e) {
        console.error('Failed to load auth state', e);
      } finally {
        setIsLoading(false);
        SplashScreen.hideAsync(); // Hide splash screen once auth is loaded
      }
    };

    loadAuthState();
  }, []);

  const login = async (userData: User, userToken: string) => {
    try {
      // await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
      // await AsyncStorage.setItem(TOKEN_KEY, userToken);
      setUser(userData);
      setToken(userToken);
      // TODO: Set axios default auth header
    } catch (e) {
      console.error('Failed to save auth state', e);
    }
  };

  const logout = async () => {
    try {
      // await AsyncStorage.removeItem(USER_KEY);
      // await AsyncStorage.removeItem(TOKEN_KEY);
      setUser(null);
      setToken(null);
      // TODO: Remove axios default auth header
    } catch (e) {
      console.error('Failed to clear auth state', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
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
