import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to signin by default
  return <Redirect href="/(auth)/signin" />;
}