import { Redirect } from "expo-router";

export default function Index() {
  // Redirect strictly to login; the AuthLayout will handle
  // redirecting to /feed if the user is already authenticated.
  return <Redirect href="/login" />;
}