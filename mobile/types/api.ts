export enum PostStatus {
  AVAILABLE = "Available",
  RESERVED = "Reserved",
  COLLECTED = "Collected",
  IN_TRANSIT = "In Transit",
  DELIVERED = "Delivered",
  EXPIRED = "Expired",
}

export enum Role {
  ADMIN = "Admin",
  DONOR = "Donor",
  RECEIVER = "Receiver",
  LOGISTICS = "Logistics",
}

export enum DeliveryMethod {
  PICKUP = "Pickup",
  DELIVERY = "Delivery",
}

export enum VerificationStatus {
  PENDING = "Pending",
  APPROVED = "Approved",
  REJECTED = "Rejected",
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface BankingDetails {
  bank_name: string;
  account_number: string;
  branch_code: string;
  account_holder: string;
}

export interface User {
  user_id: string;
  email: string;
  role: Role;
  name: string;
  address: string;
  phone_number?: string;
  coordinates?: Coordinates | null;
  verification_status: VerificationStatus;
  fcm_token?: string | null;
  verification_document_url?: string | null;
  banking_details?: BankingDetails | null;
}

export interface RegisterData {
  email: string;
  password: string;
  role: Role;
  name: string;
  address: string;
  phone_number?: string;
  verification_document_url?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface FoodPostResponse {
  post_id: string;
  title: string;
  description?: string;
  quantity: string;
  address: string;
  expiry: string;
  status: PostStatus;
  created_at: string;
  donor_id: string;
  coordinates: Coordinates;
  image_url?: string;

  receiver_id?: string;
  reserved_at?: string;
  delivery_method?: DeliveryMethod;
  distance_km?: number;
  donor_details?: User;
}

export interface FoodPostCreate {
  title: string;
  description?: string;
  quantity: string;
  address: string;
  expiry: string;
  image_url?: string;
}

export interface Reservation {
  reservation_id: string;
  post_id: string;
  receiver_id: string;
  donor_id: string;
  timestamp: string;
  status: string;
  delivery_method?: DeliveryMethod;
  post_details?: FoodPostResponse;
  receiver_details?: User;
}

export interface ReservationRequest {
  delivery_method: DeliveryMethod;
}

export interface DonationRequest {
  amount: number;
  currency: string;
  email: string;
}

export interface SystemBalance {
  total_donated: number;
  total_disbursed: number;
  current_balance: number;
}

export interface DisbursementRequest {
  receiver_id: string;
  amount: number;
  reference: string;
}