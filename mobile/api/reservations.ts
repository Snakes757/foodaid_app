import client from './client';
import { Reservation } from '@/types/api';

/**
 * Fetches the current user's reservations.
 * For Receivers: Items they have reserved.
 * For Donors: Items of theirs that have been reserved.
 */
export const getMyReservations = async (): Promise<Reservation[]> => {
  try {
    const { data } = await client.get<Reservation[]>('/reservations/me');
    return data;
  } catch (error) {
    console.error("Error fetching reservations:", error);
    throw error;
  }
};