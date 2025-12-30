import axios from 'axios';
import { auth } from '@/app/config/firebase';

// Default to 10.0.2.2 for Android Emulator access to localhost. 
// Use your machine's LAN IP (e.g., 192.168.x.x) if testing on a physical device.
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8000';

const client = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add the Firebase Auth Token to every request
client.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        console.error('Error fetching auth token', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for basic error logging
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('Network Error:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default client;