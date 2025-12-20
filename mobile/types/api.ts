
/**
 * This file should mirror the Pydantic models in your FastAPI backend.
 * Keeping them in sync is crucial for type safety.
 */

export enum PostStatus {
  AVAILABLE = "Available",
  RESERVED = "Reserved",
  COLLECTED = "Collected",
  EXPIRED = "Expired",
}

export interface FoodPostResponse {
  post_id: string;
  title: string;
  description?: string;
  quantity: string;
  location: string;
  donor_id: string;
  status: PostStatus;
  created_at: string; // datetime comes as ISO string
  expiry: string;     // datetime comes as ISO string

  // These fields are optional and added upon reservation
  receiver_id?: string;
  reserved_at?: string;
}

export interface FoodPostCreate {
  title: string;
  description?: string;
  quantity: string;
  location: string;
  expiry: string; // Will send as ISO string
}

export interface User {
  uid: string; // Or user_id, matching Firebase/your backend
  email: string;
  role: 'Donor' | 'Receiver';
  name: string;
  // Add any other fields you have in your User model
}

// TODO: Add types for API login/register request bodies
// export interface LoginCredentials { ... }
// export interface RegisterData { ... }
