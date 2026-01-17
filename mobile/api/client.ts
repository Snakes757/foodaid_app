import axios from 'axios';
import { auth } from '@/config/firebase';

// Use specific IP for physical devices, or localhost for emulators.
// Android Emulator uses 10.0.2.2 to access host localhost.
const API_URL = process.env.EXPO_PUBLIC_API_URL || process.env.API_SERVER || 'http://localhost:8000'; 


console.log(`[API Client] Initializing with Base URL: ${API_URL}`);


const client = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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