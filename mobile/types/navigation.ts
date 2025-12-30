import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  "(auth)": undefined;
  "(tabs)": undefined;
  "modal": undefined;
};

export type AuthStackParamList = {
  login: undefined;
  register: undefined;
};

export type TabParamList = {
  feed: undefined; // Home
  explore: undefined; // Map/Explore
  create: undefined; // Create Post (Donor)
  reservations: undefined; // Reserved Posts (Receiver)
  messages: undefined; // Mails/Messages
  profile: undefined; // Menu
  logistics: undefined; // Logistics Dashboard
};
/**
 * You can define your Expo Router route types here for type-safe navigation
 * e.g., export type RootStackParamList = { ... }
 */