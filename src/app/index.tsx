import { Redirect, useRootNavigationState } from 'expo-router';
import { View, Text, ActivityIndicator } from 'react-native';

export default function Index() {
  const rootNavigationState = useRootNavigationState();

  if (!rootNavigationState?.key) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={{ marginTop: 20, color: 'gray' }}>Preparing POS System...</Text>
      </View>
    );
  }

  return <Redirect href="/auth" />;
}
