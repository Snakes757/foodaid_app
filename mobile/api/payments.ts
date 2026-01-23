import client from './client';
import { DonationRequest } from '@/types/api';

interface CreateOrderResponse {
    order_id: string;
    status: string;
    links: { href: string; rel: string; method: string }[];
}

interface CaptureOrderResponse {
    status: string;
    id: string;
}

export const createPaymentOrder = async (donation: DonationRequest): Promise<CreateOrderResponse> => {
    const { data } = await client.post<CreateOrderResponse>('/payments/create-payment', donation);
    return data;
};

export const capturePaymentOrder = async (orderId: string): Promise<CaptureOrderResponse> => {
    const { data } = await client.post<CaptureOrderResponse>(`/payments/${orderId}/capture`);
    return data;
};