import client from './client';
import { auth } from '@/config/firebase';
import { signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { User, LoginCredentials, RegisterData, UserCreateGoogle } from '@/types/api';

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

export const registerGoogleUser = async (userData: UserCreateGoogle): Promise<User> => {
  // This endpoint creates the Firestore profile for a user already signed in with Google
  const { data } = await client.post<User>('/auth/register/google', userData);
  return data;
};

export const getUserProfile = async (): Promise<User> => {
  const { data } = await client.get<User>('/auth/me');
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