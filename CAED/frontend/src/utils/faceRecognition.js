/**
 * CAED - Face Recognition Utility
 * Usa landmarks de expo-face-detector para comparar identidad
 * Sin servicios externos - 100% local en el dispositivo
 */

const SIMILARITY_THRESHOLD = 0.18; // Distancia máxima para considerar mismo rostro
const BLINK_THRESHOLD = 0.25;      // Probabilidad ojo cerrado = parpadeo
const SMILE_THRESHOLD = 0.75;      // Probabilidad sonrisa
const HEAD_TURN_THRESHOLD = 25;    // Grados para considerar giro de cabeza
const EYE_OPEN_THRESHOLD = 0.7;    // Ojos deben estar abiertos al registrar

/**
 * Extrae un "fingerprint" del rostro a partir de los landmarks
 * Normalizado por los bounds del rostro para ser invariante a posición/tamaño
 */
export const extractFaceFingerprint = (face) => {
  if (!face || !face.bounds) return null;

  const { origin, size } = face.bounds;
  const w = size.width;
  const h = size.height;

  // Normalizar cada landmark relativo al bounding box del rostro
  const normalize = (point) => {
    if (!point) return { x: 0, y: 0 };
    return {
      x: (point.x - origin.x) / w,
      y: (point.y - origin.y) / h,
    };
  };

  const landmarks = {
    leftEye: normalize(face.leftEyePosition),
    rightEye: normalize(face.rightEyePosition),
    noseBase: normalize(face.noseBasePosition),
    leftCheek: normalize(face.leftCheekPosition),
    rightCheek: normalize(face.rightCheekPosition),
    leftMouth: normalize(face.leftMouthPosition),
    rightMouth: normalize(face.rightMouthPosition),
    bottomMouth: normalize(face.bottomMouthPosition),
  };

  // Calcular ratios geométricos del rostro (más robustos que posiciones brutas)
  const eyeDistance = distance(landmarks.leftEye, landmarks.rightEye);
  const eyeNoseRatio = distance(landmarks.leftEye, landmarks.noseBase) / (eyeDistance || 1);
  const mouthWidth = distance(landmarks.leftMouth, landmarks.rightMouth) / (eyeDistance || 1);
  const faceLengthRatio = distance(landmarks.leftEye, landmarks.bottomMouth) / (eyeDistance || 1);
  const cheekRatio = distance(landmarks.leftCheek, landmarks.rightCheek) / (eyeDistance || 1);
  const eyeSymmetry = Math.abs(
    distance(landmarks.leftEye, landmarks.noseBase) -
    distance(landmarks.rightEye, landmarks.noseBase)
  ) / (eyeDistance || 1);

  return {
    landmarks,
    ratios: {
      eyeNoseRatio,
      mouthWidth,
      faceLengthRatio,
      cheekRatio,
      eyeSymmetry,
    },
    rollAngle: face.rollAngle || 0,
    yawAngle: face.yawAngle || 0,
  };
};

/**
 * Compara dos fingerprints faciales
 * Retorna: { match: boolean, confidence: number (0-100) }
 */
export const compareFaces = (stored, current) => {
  if (!stored || !current) return { match: false, confidence: 0 };

  try {
    const storedData = typeof stored === 'string' ? JSON.parse(stored) : stored;
    const currentData = typeof current === 'string' ? JSON.parse(current) : current;

    // Comparar ratios geométricos (peso 60%)
    const ratioScore = compareRatios(storedData.ratios, currentData.ratios);

    // Comparar landmarks normalizados (peso 40%)
    const landmarkScore = compareLandmarks(storedData.landmarks, currentData.landmarks);

    // Score combinado
    const totalScore = (ratioScore * 0.6) + (landmarkScore * 0.4);
    const confidence = Math.round((1 - totalScore) * 100);
    const match = totalScore < SIMILARITY_THRESHOLD;

    return { match, confidence: Math.max(0, Math.min(100, confidence)) };
  } catch (e) {
    return { match: false, confidence: 0 };
  }
};

const compareRatios = (r1, r2) => {
  if (!r1 || !r2) return 1;
  const diffs = [
    Math.abs(r1.eyeNoseRatio - r2.eyeNoseRatio),
    Math.abs(r1.mouthWidth - r2.mouthWidth),
    Math.abs(r1.faceLengthRatio - r2.faceLengthRatio),
    Math.abs(r1.cheekRatio - r2.cheekRatio),
    Math.abs(r1.eyeSymmetry - r2.eyeSymmetry),
  ];
  return diffs.reduce((a, b) => a + b, 0) / diffs.length;
};

const compareLandmarks = (l1, l2) => {
  if (!l1 || !l2) return 1;
  const keys = ['leftEye', 'rightEye', 'noseBase', 'leftMouth', 'rightMouth'];
  const dists = keys.map(k => l1[k] && l2[k] ? distance(l1[k], l2[k]) : 0.5);
  return dists.reduce((a, b) => a + b, 0) / dists.length;
};

const distance = (p1, p2) => {
  if (!p1 || !p2) return 0;
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

// ============ LIVENESS DETECTION ============

export const CHALLENGES = {
  BLINK: {
    key: 'BLINK',
    instruction: '👁️ Parpadea naturalmente',
    icon: '👁️',
    timeout: 5000,
  },
  SMILE: {
    key: 'SMILE',
    instruction: '😊 Sonríe',
    icon: '😊',
    timeout: 5000,
  },
  TURN_LEFT: {
    key: 'TURN_LEFT',
    instruction: '⬅️ Gira la cabeza a la izquierda',
    icon: '⬅️',
    timeout: 5000,
  },
  TURN_RIGHT: {
    key: 'TURN_RIGHT',
    instruction: '➡️ Gira la cabeza a la derecha',
    icon: '➡️',
    timeout: 5000,
  },
};

export const getRandomChallenges = (count = 2) => {
  const all = Object.values(CHALLENGES);
  // Siempre incluye BLINK como primer desafío
  const rest = all.filter(c => c.key !== 'BLINK').sort(() => Math.random() - 0.5);
  return [CHALLENGES.BLINK, ...rest.slice(0, count - 1)];
};

/**
 * Verifica si un desafío fue completado
 */
export const checkChallenge = (challengeKey, face, prevFace) => {
  if (!face) return false;

  switch (challengeKey) {
    case 'BLINK':
      // Detectar que los ojos estuvieron cerrados (usando historial)
      const leftClosed = face.leftEyeOpenProbability < BLINK_THRESHOLD;
      const rightClosed = face.rightEyeOpenProbability < BLINK_THRESHOLD;
      return leftClosed && rightClosed;

    case 'SMILE':
      return face.smilingProbability > SMILE_THRESHOLD;

    case 'TURN_LEFT':
      return face.yawAngle > HEAD_TURN_THRESHOLD;

    case 'TURN_RIGHT':
      return face.yawAngle < -HEAD_TURN_THRESHOLD;

    default:
      return false;
  }
};

/**
 * Detecta parpadeo natural (para activación de sesión)
 * No requiere ningún movimiento voluntario
 */
export const detectNaturalBlink = (face, prevEyeState) => {
  if (!face) return { blinked: false, eyeState: 'unknown' };

  const leftOpen = face.leftEyeOpenProbability > BLINK_THRESHOLD;
  const rightOpen = face.rightEyeOpenProbability > BLINK_THRESHOLD;
  const eyesOpen = leftOpen && rightOpen;

  // Si los ojos estaban abiertos y ahora están cerrados → parpadeo
  const blinked = prevEyeState === 'open' && !eyesOpen;

  return {
    blinked,
    eyeState: eyesOpen ? 'open' : 'closed',
  };
};

export const isFaceValid = (face) => {
  if (!face) return false;
  const leftOpen = face.leftEyeOpenProbability > EYE_OPEN_THRESHOLD;
  const rightOpen = face.rightEyeOpenProbability > EYE_OPEN_THRESHOLD;
  const notTilted = Math.abs(face.yawAngle || 0) < 20 && Math.abs(face.rollAngle || 0) < 20;
  return leftOpen && rightOpen && notTilted;
};
