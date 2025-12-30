import client from './client';
import { auth } from '@/app/config/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { User, LoginCredentials, RegisterData } from '@/types/api';

// Login using Firebase SDK directly (Best Practice)
// The token will be intercepted by client.ts for subsequent requests
export const loginUser = async (credentials: LoginCredentials) => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth, 
      credentials.email, 
      credentials.password
    );
    return userCredential.user;
  } catch (error: any) {
    throw error;
  }
};

// Register via Backend
// The backend handles creating the Auth user AND the Firestore document
export const registerUser = async (userData: RegisterData): Promise<User> => {
  const { data } = await client.post<User>('/auth/register', userData);
  return data;
};

// Fetch current user profile from backend
export const getUserProfile = async (): Promise<User> => {
  const { data } = await client.get<User>('/auth/me');
  return data;
};

export const logoutUser = async () => {
  await signOut(auth);
};