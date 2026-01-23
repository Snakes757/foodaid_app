import 'dotenv/config';

export default {
  expo: {
    name: "FoodAid",
    slug: "foodaid-mobile",
    version: "1.0.0",
    orientation: "portrait",

    scheme: "myapp",
    userInterfaceStyle: "automatic",

    splash: {
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.foodaid.mobile",
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
    },

    android: {
      adaptiveIcon: {
        backgroundColor: "#ffffff",
      },
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
        },
      },
    },

    web: {
      bundler: "metro",
      output: "static",
    },

    plugins: [
      "expo-router",
      "expo-web-browser",
      "@react-native-community/datetimepicker",
    ],

    experiments: {
      typedRoutes: true,
    },

    extra: {
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    },
  },
};
