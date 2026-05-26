import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';
import {
  checkChallenge, detectNaturalBlink, extractFaceFingerprint,
  compareFaces, isFaceValid, getRandomChallenges, CHALLENGES
} from '../utils/faceRecognition';
import { COLORS, FONTS, RADIUS } from '../utils/theme';

const { width: SCREEN_W } = Dimensions.get('window');
const OVAL_W = SCREEN_W * 0.68;
const OVAL_H = OVAL_W * 1.28;

export default function FaceCamera({
  mode = 'session',
  storedFingerprint = null,
  onSuccess,
  onError,
}) {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [faceDetected, setFaceDetected] = useState(false);
  const [currentFace, setCurrentFace] = useState(null);
  const [phase, setPhase] = useState('center');
  const [challenges, setChallenges] = useState([]);
  const [currentChallengeIdx, setCurrentChallengeIdx] = useState(0);
  const [completedChallenges, setCompletedChallenges] = useState([]);
  const [eyeState, setEyeState] = useState('unknown');
  const [blinkDetected, setBlinkDetected] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Centra tu rostro en el óvalo');
  const [messageType, setMessageType] = useState('info');
  const ovalAnim = useRef(new Animated.Value(0)).current;
  const prevFaceRef = useRef(null);
  const challengeTimerRef = useRef(null);
  const captureTimeoutRef = useRef(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
    if (mode === 'register') {
      setChallenges(getRandomChallenges(2));
    }
    return () => {
      clearTimeout(challengeTimerRef.current);
      clearTimeout(captureTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    Animated.spring(ovalAnim, {
      toValue: faceDetected ? 1 : 0,
      useNativeDriver: false,
      tension: 60, friction: 8,
    }).start();
  }, [faceDetected]);

  const ovalBorderColor = ovalAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.4)', COLORS.success],
  });

  const handleFacesDetected = useCallback(({ faces }) => {
    const face = faces[0] || null;
    setFaceDetected(!!face);
    setCurrentFace(face);

    if (!face) {
      setMessage('Centra tu rostro en el óvalo');
      setMessageType('info');
      prevFaceRef.current = null;
      return;
    }

    if (phase === 'center') {
      if (isFaceValid(face)) {
        setMessage('✅ Rostro detectado');
        setMessageType('success');
        setTimeout(() => {
          if (mode === 'register') {
            setPhase('challenges');
            setMessage(challenges[0]?.instruction || '');
          } else {
            setPhase('blink');
            setMessage('👁️ Mantén la mirada al frente...');
          }
        }, 800);
      } else {
        setMessage('Mira directamente a la cámara');
        setMessageType('info');
      }
    }

    if (phase === 'challenges' && challenges.length > 0) {
      const challenge = challenges[currentChallengeIdx];
      if (challenge && checkChallenge(challenge.key, face, prevFaceRef.current)) {
        handleChallengeCompleted(challenge.key);
      }
    }

    if (phase === 'blink') {
      const { blinked, eyeState: newEyeState } = detectNaturalBlink(face, eyeState);
      setEyeState(newEyeState);
      if (blinked && !blinkDetected) {
        setBlinkDetected(true);
        setMessage('✅ Verificando identidad...');
        setMessageType('success');
        setPhase('capture');
        captureAndCompare();
      }
    }

    prevFaceRef.current = face;
  }, [phase, challenges, currentChallengeIdx, eyeState, blinkDetected]);

  const handleChallengeCompleted = (challengeKey) => {
    const newCompleted = [...completedChallenges, challengeKey];
    setCompletedChallenges(newCompleted);
    setProgress((newCompleted.length / challenges.length) * 100);

    if (newCompleted.length >= challenges.length) {
      setMessage('✅ ¡Perfecto! Capturando...');
      setMessageType('success');
      setPhase('capture');
      setTimeout(() => captureForRegister(), 500);
    } else {
      const next = challenges[currentChallengeIdx + 1];
      setCurrentChallengeIdx(prev => prev + 1);
      setMessage(next?.instruction || '');
      setMessageType('info');
    }
  };

  const captureForRegister = async () => {
    try {
      if (!cameraRef.current) return;
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.8 });
      const fingerprint = currentFace ? extractFaceFingerprint(currentFace) : null;
      if (!fingerprint) {
        onError?.('No se pudo extraer el mapa facial. Intenta de nuevo.');
        return;
      }
      onSuccess?.({ photo: photo.base64, fingerprint: JSON.stringify(fingerprint) });
    } catch (e) {
      onError?.('Error al capturar. Intenta de nuevo.');
    }
  };

  const captureAndCompare = async () => {
    try {
      if (!cameraRef.current || !currentFace) {
        setPhase('blink');
        setBlinkDetected(false);
        setMessage('👁️ Mantén la mirada al frente...');
        return;
      }

      const currentFingerprint = extractFaceFingerprint(currentFace);
      if (!currentFingerprint) {
        onError?.('No se pudo detectar el rostro. Intenta de nuevo.');
        return;
      }

      const { match, confidence } = compareFaces(storedFingerprint, currentFingerprint);

      if (match && confidence > 55) {
        setMessage(`✅ Identidad verificada (${confidence}%)`);
        setMessageType('success');
        const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
        setTimeout(() => onSuccess?.({ photo: photo.base64, confidence }), 600);
      } else {
        setMessage('❌ Rostro no reconocido. Intenta de nuevo.');
        setMessageType('error');
        setTimeout(() => {
          setPhase('blink');
          setBlinkDetected(false);
          setMessage('👁️ Mantén la mirada al frente...');
          setMessageType('info');
        }, 2000);
      }
    } catch (e) {
      onError?.('Error de verificación. Intenta de nuevo.');
    }
  };

  if (!permission) return (
    <View style={styles.container}>
      <Text style={styles.permText}>Solicitando permiso de cámara...</Text>
    </View>
  );

  if (!permission.granted) return (
    <View style={styles.container}>
      <Text style={styles.permText}>Se necesita acceso a la cámara</Text>
    </View>
  );

  const currentChallenge = challenges[currentChallengeIdx];

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="front"
        onFacesDetected={handleFacesDetected}
        faceDetectorSettings={{
          mode: FaceDetector.FaceDetectorMode.fast,
          detectLandmarks: FaceDetector.FaceDetectorLandmarks.all,
          runClassifications: FaceDetector.FaceDetectorClassifications.all,
          minDetectionInterval: 80,
          tracking: true,
        }}
      />

      <View style={styles.overlay} pointerEvents="none" />

      <View style={styles.ovalWrapper} pointerEvents="none">
        <Animated.View style={[styles.oval, { borderColor: ovalBorderColor }]} />
      </View>

      {mode === 'register' && phase === 'challenges' && (
        <View style={styles.progressContainer} pointerEvents="none">
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <View style={styles.challengeIcons}>
            {challenges.map((c, i) => (
              <View key={c.key} style={[
                styles.challengeIconBox,
                completedChallenges.includes(c.key) && styles.challengeIconDone,
                i === currentChallengeIdx && styles.challengeIconActive,
              ]}>
                <Text style={styles.challengeIconText}>{c.icon}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={[
        styles.messageBox,
        messageType === 'success' && styles.messageSuccess,
        messageType === 'error' && styles.messageError,
      ]} pointerEvents="none">
        <Text style={styles.messageText}>{message}</Text>
      </View>

      {mode === 'register' && phase === 'challenges' && currentChallenge && (
        <View style={styles.challengeBox} pointerEvents="none">
          <Text style={styles.challengeTitle}>Desafío {currentChallengeIdx + 1}/{challenges.length}</Text>
          <Text style={styles.challengeInstruction}>{currentChallenge.instruction}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  permText: { color: COLORS.white, ...FONTS.body, textAlign: 'center', padding: 20 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  ovalWrapper: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -(OVAL_H / 2) - 30,
    marginLeft: -(OVAL_W / 2),
    zIndex: 10,
  },
  oval: {
    width: OVAL_W,
    height: OVAL_H,
    borderRadius: OVAL_W / 2,
    borderWidth: 3,
    backgroundColor: 'transparent',
  },
  progressContainer: {
    position: 'absolute', top: 80, left: 20, right: 20, zIndex: 20,
  },
  progressBar: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3, overflow: 'hidden',
  },
  progressFill: {
    height: 6, backgroundColor: COLORS.success, borderRadius: 3,
  },
  challengeIcons: {
    flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 12,
  },
  challengeIconBox: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  challengeIconDone: { backgroundColor: COLORS.success },
  challengeIconActive: {
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderWidth: 2, borderColor: COLORS.white,
  },
  challengeIconText: { fontSize: 20 },
  messageBox: {
    position: 'absolute', bottom: 160, left: 20, right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: RADIUS.md, paddingVertical: 12, paddingHorizontal: 20,
    alignItems: 'center', zIndex: 20,
  },
  messageSuccess: { backgroundColor: 'rgba(45,198,83,0.85)' },
  messageError: { backgroundColor: 'rgba(230,57,70,0.85)' },
  messageText: { ...FONTS.h4, color: COLORS.white, textAlign: 'center' },
  challengeBox: {
    position: 'absolute', bottom: 80, left: 20, right: 20,
    backgroundColor: 'rgba(10,36,99,0.85)',
    borderRadius: RADIUS.lg, padding: 20, alignItems: 'center', zIndex: 20,
  },
  challengeTitle: { ...FONTS.tiny, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1 },
  challengeInstruction: { ...FONTS.h3, color: COLORS.white, marginTop: 6, textAlign: 'center' },
});
