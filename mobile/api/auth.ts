import client from './client';
import { auth } from '@/config/firebase';
import { signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { User, LoginCredentials, RegisterData } from '@/types/api';

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

export const registerUser = async (userData: RegisterData): Promise<User> => {
  const { data } = await client.post<User>('/auth/register', userData);
  return data;
};

export const getUserProfile = async (): Promise<User> => {
  const { data } = await client.get<User>('/auth/me');
  return data;
};

export const updateUserProfile = async (userData: Partial<User>): Promise<User> => {
  const { data } = await client.put<User>('/auth/me', userData);
  return data;
};

export const logoutUser = async () => {
  await signOut(auth);
};

export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    throw error;
  }
};