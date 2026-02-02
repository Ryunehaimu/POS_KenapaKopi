import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';
import { X, RefreshCcw } from 'lucide-react-native';

interface CameraModalProps {
  isVisible: boolean;
  onClose: () => void;
  onCapture: (photo: any) => void;
  mode: 'in' | 'out';
  employeeName: string;
}

export default function CameraModal({ isVisible, onClose, onCapture, mode, employeeName }: CameraModalProps) {
  const [facing, setFacing] = useState<CameraType>('front');
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (isVisible && !permission?.granted) {
      requestPermission();
    }
  }, [isVisible]);

  const takePicture = async () => {
    if (cameraRef.current && !isProcessing) {
      setIsProcessing(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          base64: true,
        });

        if (!photo) {
          throw new Error("Gagal mengambil gambar");
        }

        // Validate Face Post-Capture
        const options = {
           mode: FaceDetector.FaceDetectorMode.fast,
           detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
           runClassifications: FaceDetector.FaceDetectorClassifications.none,
        };
        
        const result = await FaceDetector.detectFacesAsync(photo.uri, options);

        if (result.faces.length > 0) {
           onCapture(photo);
        } else {
           Alert.alert("Wajah Tidak Terdeteksi", "Mohon pastikan wajah anda terlihat jelas di kamera.");
        }

      } catch (error) {
        console.error("Camera Error:", error);
        Alert.alert("Error", "Terjadi kesalahan saat mengambil foto.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const toggleCameraFacing = () => {
    setFacing((current: CameraType) => (current === 'back' ? 'front' : 'back'));
  };

  if (!permission) return <View />;
  
  if (!permission.granted) {
    return (
      <Modal visible={isVisible} animationType="slide">
        <View style={styles.container}>
          <Text style={styles.text}>Kami membutuhkan izin kamera untuk absensi.</Text>
          <TouchableOpacity onPress={requestPermission} style={styles.button}>
            <Text style={styles.buttonText}>Berikan Izin</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
             <Text style={styles.closeText}>Batal</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={isVisible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          facing={facing}
          ref={cameraRef}
        >
          <View style={styles.overlay}>
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.iconButton}>
                <X color="white" size={28} />
              </TouchableOpacity>
              <Text style={styles.headerText}>
                 Absensi {mode === 'in' ? 'Masuk' : 'Pulang'} - {employeeName}
              </Text>
              <TouchableOpacity onPress={toggleCameraFacing} style={styles.iconButton}>
                <RefreshCcw color="white" size={28} />
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              {isProcessing ? (
                 <ActivityIndicator size="large" color="white" />
              ) : (
                <>
                  <View style={styles.statusContainer}>
                     <Text style={styles.statusText}>
                        Pastikan wajah terlihat jelas
                     </Text>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.captureButton}
                    onPress={takePicture}
                  >
                    <View style={styles.captureInner} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </CameraView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 40,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 10,
    borderRadius: 10,
  },
  headerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    marginBottom: 40,
    height: 120, // Fixed height to prevent jumpiness
    justifyContent: 'flex-end',
  },
  statusContainer: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: 'black',
    backgroundColor: 'white',
  },
  text: {
    color: 'white',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#4F46E5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 15,
  },
  closeText: {
    color: '#EF4444',
    fontSize: 16,
  },
  iconButton: {
    padding: 5,
  }
});
