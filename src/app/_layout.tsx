import { Slot } from 'expo-router';
import { LogBox } from 'react-native';
import "../../global.css";

// Suppress all warnings for clean UI
LogBox.ignoreAllLogs(true);

export default function RootLayout() {
  return <Slot />;
}
