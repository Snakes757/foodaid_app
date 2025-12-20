
import client from './client';
// Import your User type and login credentials type
// import { User, LoginCredentials, RegisterData } from '@/types/api';

// Example login function
export const loginUser = async (credentials: any) => {
  // const { data } = await client.post<{ user: User, token: string }>('/api/v1/auth/login', credentials);
  // return data;
  console.log('TODO: Implement loginUser', credentials);
};

// Example register function
export const registerUser = async (userData: any) => {
  // const { data } = await client.post<User>('/api/v1/auth/register', userData);
  // return data;
  console.log('TODO: Implement registerUser', userData);
};
