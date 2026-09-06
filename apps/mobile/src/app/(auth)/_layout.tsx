import { Stack } from 'expo-router';

/** Auth flow (spec §9): no headers — screens manage their own chrome. */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
