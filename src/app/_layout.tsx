import { Slot } from 'expo-router';
import { LogBox } from 'react-native';
import "../../global.css";

// Suppress known warnings that are from dependencies or planned for future migration
LogBox.ignoreLogs([
  'SafeAreaView has been deprecated', 
  'ExpoFaceDetector has been deprecated'
]);

export default function RootLayout() {
  return <Slot />;
}
