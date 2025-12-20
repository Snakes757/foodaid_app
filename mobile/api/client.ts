
import axios from 'axios';
// You might need to install expo-constants
// import Constants from 'expo-constants';

// Get the API_URL from environment variables
// Make sure to name it EXPO_PUBLIC_API_URL in your .env file
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8000';

const client = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptors to automatically include the auth token
client.interceptors.request.use(async (config) => {
  // --- TODO ---
  // You need to replace this with a function that gets the token
  // from your auth context or AsyncStorage
  // const token = await getAuthTokenFromStorage(); 
  // if (token) {
  //   config.headers.Authorization = `Bearer ${token}`;
  // }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default client;
