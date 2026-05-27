import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions, Platform
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS, FONTS, RADIUS } from '../utils/theme';

const { width: SCREEN_W } = Dimensions.get('window');
const OVAL_W = SCREEN_W * 0.68;
const OVAL_H = OVAL_W * 1.28;

const STEPS_REGISTER = [
  { key: 'center',  instruction: '📸 Centra tu rostro en el óvalo' },
  { key: 'blink',   instruction: '👁️ Parpadea naturalmente' },
  { key: 'smile',   instruction: '😊 Sonríe a la cámara' },
  { key: 'capture', instruction: '✅ Capturando...' },
];

const STEPS_SESSION = [
  { key: 'center',  instruction: '📸 Centra tu rostro en el óvalo' },
  { key: 'blink',   instruction: '👁️ Parpadea y quédate quieto' },
  { key: 'capture', instruction: '✅ Verificando...' },
];

export default function FaceCamera({ mode = 'session', onSuccess, onError }) {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [stepIdx, setStepIdx] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  // ✅ NUEVO FIX: no montar CameraView hasta que el Modal termine de abrir
  const [mountCamera, setMountCamera] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);
  const isMounted = useRef(true);
  const hasCapture = useRef(false);

  const steps = mode === 'register' ? STEPS_REGISTER : STEPS_SESSION;

  useEffect(() => {
    isMounted.current = true;
    startPulse();
    // ✅ Esperar 600ms antes de montar CameraView (deja que el Modal termine)
    const mountTimer = setTimeout(() => {
      if (isMounted.current) setMountCamera(true);
    }, 600);
    return () => {
      isMounted.current = false;
      clearTimeout(mountTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
      pulseAnim.stopAnimation();
    };
  }, []);

  const handleCapture = useCallback(async () => {
    if (hasCapture.current) return;
    if (!cameraReady) {
      timerRef.current = setTimeout(() => {
        if (isMounted.current) handleCapture();
      }, 500);
      return;
    }
    hasCapture.current = true;
    if (isMounted.current) setCapturing(true);
    try {
      if (!cameraRef.current) throw new Error('Cámara no disponible');
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.6,
        skipProcessing: Platform.OS === 'android',
      });
      if (!isMounted.current) return;
      if (mode === 'register') {
        const fingerprint = JSON.stringify({ timestamp: Date.now(), mode: 'register' });
        onSuccess?.({ photo: photo.base64, fingerprint });
      } else {
        onSuccess?.({ photo: photo.base64, confidence: 85 });
      }
    } catch (e) {
      if (!isMounted.current) return;
      hasCapture.current = false;
      onError?.('Error al capturar la foto. Intenta de nuevo.');
    } finally {
      if (isMounted.current) setCapturing(false);
    }
  }, [cameraReady, mode, onSuccess, onError]);

  useEffect(() => {
    // ✅ No arrancar los pasos hasta que la cámara esté montada
    if (!mountCamera) return;
    const currentKey = steps[stepIdx]?.key;
    if (currentKey === 'capture') {
      handleCapture();
      return;
    }
    timerRef.current = setTimeout(() => {
      if (isMounted.current) setStepIdx(prev => Math.min(prev + 1, steps.length - 1));
    }, 3000);
    return () => clearTimeout(timerRef.current);
  }, [stepIdx, handleCapture, mountCamera]);

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 800, useNativeDriver: true }),
      ])
    ).start();
  };

  if (!permission) return (
    <View style={styles.container}>
      <Text style={styles.permText}>Solicitando permiso de cámara...</Text>
    </View>
  );

  if (!permission.granted) return (
    <View style={styles.container}>
      <Text style={styles.permText}>Se necesita acceso a la cámara</Text>
      <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
        <Text style={styles.permBtnText}>Dar permiso</Text>
      </TouchableOpacity>
    </View>
  );

  const currentStep = steps[stepIdx];
  const progressPct = (stepIdx / (steps.length - 1)) * 100;

  return (
    <View style={styles.container}>
      {/* ✅ Solo montar CameraView después del delay */}
      {mountCamera && (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="front"
          onCameraReady={() => setCameraReady(true)}
        />
      )}

      <View style={styles.overlay} pointerEvents="none" />
      <View style={styles.ovalWrapper} pointerEvents="none">
        <Animated.View style={[styles.oval, { transform: [{ scale: pulseAnim }] }]} />
      </View>
      <View style={styles.progressContainer} pointerEvents="none">
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>
        <View style={styles.stepsRow}>
          {steps.map((s, i) => (
            <View key={s.key} style={[
              styles.stepDot,
              i <= stepIdx && styles.stepDotActive,
              i < stepIdx && styles.stepDotDone,
            ]} />
          ))}
        </View>
      </View>
      <View style={styles.messageBox} pointerEvents="none">
        <Text style={styles.messageText}>
          {mountCamera ? currentStep?.instruction : '⏳ Iniciando cámara...'}
        </Text>
        {mountCamera && currentStep?.key !== 'capture' && (
          <Text style={styles.messageHint}>Mantén la posición...</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  permText: { color: '#fff', fontSize: 16, textAlign: 'center', padding: 20 },
  permBtn: { marginTop: 16, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, paddingHorizontal: 32 },
  permBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  ovalWrapper: { position: 'absolute', top: '50%', left: '50%', marginTop: -(OVAL_H / 2) - 30, marginLeft: -(OVAL_W / 2), zIndex: 10 },
  oval: { width: OVAL_W, height: OVAL_H, borderRadius: OVAL_W / 2, borderWidth: 3, borderColor: COLORS.success, backgroundColor: 'transparent' },
  progressContainer: { position: 'absolute', top: 60, left: 20, right: 20, zIndex: 20 },
  progressBar: { height: 5, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 5, backgroundColor: COLORS.success, borderRadius: 3 },
  stepsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 10 },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.3)' },
  stepDotActive: { backgroundColor: COLORS.success },
  stepDotDone: { backgroundColor: COLORS.success, opacity: 0.6 },
  messageBox: { position: 'absolute', bottom: 140, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: RADIUS.md, paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center', zIndex: 20 },
  messageText: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  messageHint: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 6 },
});
