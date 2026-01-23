import client from './client';
import { User, VerificationStatus, SystemBalance, DisbursementRequest } from '@/types/api';

export const getAllUsers = async (): Promise<User[]> => {
  const { data } = await client.get<User[]>('/admin/users');
  return data;
};

export const verifyUser = async (userId: string, status: VerificationStatus, reason?: string): Promise<User> => {
  const { data } = await client.post<User>('/admin/users/verify', {
    user_id: userId,
    status,
    rejection_reason: reason
  });
  return data;
};

// --- NEW FINANCE ENDPOINTS ---

export const getSystemBalance = async (): Promise<SystemBalance> => {
    const { data } = await client.get<SystemBalance>('/payments/admin/balance');
    return data;
};

export const disburseFunds = async (request: DisbursementRequest): Promise<void> => {
    await client.post('/payments/admin/disburse', request);
};