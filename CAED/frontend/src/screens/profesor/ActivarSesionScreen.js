import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, Modal, ScrollView, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { profesorService, locationService } from '../../services/services';
import FaceCamera from '../../components/FaceCamera';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../../utils/theme';
import { StatusBadge } from '../../components/UIComponents';
import Toast from 'react-native-toast-message';
import moment from 'moment';
import 'moment/locale/es';
import api from '../../services/api';
moment.locale('es');

export default function ActivarSesionScreen({ route, navigation }) {
  const { user } = useAuth();
  const { clase } = route.params || {};
  const [phase, setPhase] = useState('gps');
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [coordenadas, setCoordenadas] = useState(null);
  const [sesion, setSesion] = useState(null);
  const [estudiantes, setEstudiantes] = useState([]);
  const [habilitando, setHabilitando] = useState(null);
  const [campusConfig, setCampusConfig] = useState({
    latitude: 11.5140459,
    longitude: -72.8691971,
    radio: 2000,
  });

  // Cargar config del campus desde la DB
  useEffect(() => {
    const cargarCampus = async () => {
      try {
        const res = await api.get('/admin/campus-config');
        setCampusConfig(res.data);
      } catch (e) {
        console.log('Usando coordenadas por defecto');
      }
    };
    cargarCampus();
  }, []);

  useEffect(() => {
    if (sesion) {
      loadEstudiantes();
      const interval = setInterval(loadEstudiantes, 15000);
      return () => clearInterval(interval);
    }
  }, [sesion]);

  const loadEstudiantes = async () => {
    try {
      const res = await profesorService.getEstudiantesClase(sesion.id);
      setEstudiantes(res.data);
    } catch {}
  };

  // ── Paso 1: GPS ──
  const verificarGPS = async () => {
    setLoading(true);
    try {
      const coords = await locationService.getCurrentLocation();
      const campusCoords = {
        latitude: campusConfig.latitude,
        longitude: campusConfig.longitude,
      };
      const dentro = locationService.isInsideCampus(coords, campusCoords, campusConfig.radio);
      if (!dentro) {
        Alert.alert('📍 Fuera del campus', 'Debes estar físicamente dentro del campus universitario para activar la sesión.');
        setLoading(false);
        return;
      }
      setCoordenadas(coords);
      setPhase('camera');
    } catch {
      Alert.alert('Error', 'No se pudo obtener tu ubicación. Activa el GPS.');
    } finally {
      setLoading(false);
    }
  };

  // ── Paso 2: Face ──
  const handleFaceSuccess = async ({ photo, confidence }) => {
    setShowCamera(false);
    setLoading(true);
    try {
      const data = {
        carga_academica_id: clase.id,
        foto_facial: photo,
        coordenadas_gps: `${coordenadas.latitude},${coordenadas.longitude}`,
        profesor_id: user.profesor_id,
      };
      const res = await profesorService.activarSesion(data);
      setSesion(res.data);
      setPhase('activa');
      Toast.show({ type: 'success', text1: '✅ Sesión activada', text2: `Confianza: ${confidence}%` });
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'No se pudo activar la sesión');
      setPhase('camera');
    } finally {
      setLoading(false);
    }
  };

  const handleFaceError = (msg) => {
    setShowCamera(false);
    Alert.alert('Verificación fallida', msg, [
      { text: 'Reintentar', onPress: () => setShowCamera(true) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  // ── Habilitar estudiante ──
  const habilitarEst = async (est) => {
    setHabilitando(est.id);
    try {
      await profesorService.habilitarEstudiante(sesion.id, est.id);
      setEstudiantes(prev => prev.map(e => e.id === est.id ? { ...e, habilitado: true } : e));
      Toast.show({ type: 'success', text1: `✅ ${est.nombre} habilitado` });
    } catch {
      Alert.alert('Error', 'No se pudo habilitar al estudiante');
    } finally {
      setHabilitando(null);
    }
  };

  const habilitarTodos = () => {
    Alert.alert('Habilitar todos', '¿Habilitar a todos los estudiantes de una vez?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sí, todos', onPress: async () => {
        for (const e of estudiantes.filter(e => !e.habilitado)) {
          await habilitarEst(e);
        }
      }},
    ]);
  };

  const cerrarSesion = () => {
    Alert.alert('Cerrar sesión', '¿Deseas cerrar la sesión de clase ahora?', [
      { text: 'No', style: 'cancel' },
      { text: 'Sí, cerrar', style: 'destructive', onPress: async () => {
        setLoading(true);
        try {
          await profesorService.cerrarSesion(sesion.id);
          Toast.show({ type: 'success', text1: '✅ Sesión cerrada' });
          navigation.goBack();
        } catch {
          Alert.alert('Error', 'No se pudo cerrar la sesión');
        } finally {
          setLoading(false);
        }
      }},
    ]);
  };

  // ── RENDER: GPS ──
  if (phase === 'gps') return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Activar sesión</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.claseCard}>
          <View style={styles.claseIconBox}><Text style={styles.claseIcon}>📚</Text></View>
          <Text style={styles.claseNombre}>{clase?.materia_nombre}</Text>
          <Text style={styles.claseAula}>📍 {clase?.aula}</Text>
          <Text style={styles.claseHora}>⏰ {clase?.horario_inicio} — {clase?.horario_fin}</Text>
          <Text style={styles.claseCarrera}>🎓 {clase?.carrera_nombre}</Text>
        </View>

        <View style={styles.stepsCard}>
          <Text style={styles.stepsTitle}>Pasos de verificación</Text>
          {[
            { num: '1', icon: '📍', title: 'Ubicación GPS', desc: 'Verificar que estás dentro del campus', done: false, active: true },
            { num: '2', icon: '👁️', title: 'Verificación facial', desc: 'Parpadeo natural + reconocimiento', done: false, active: false },
            { num: '3', icon: '✅', title: 'Sesión activa', desc: 'Habilita estudiantes y registra asistencia', done: false, active: false },
          ].map((s, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepNum, s.active && styles.stepNumActive]}>
                <Text style={[styles.stepNumText, s.active && styles.stepNumTextActive]}>{s.num}</Text>
              </View>
              <View style={styles.stepInfo}>
                <Text style={styles.stepIcon}>{s.icon} <Text style={styles.stepTitle2}>{s.title}</Text></Text>
                <Text style={styles.stepDesc}>{s.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.campusInfo}>
          <Text style={styles.campusInfoText}>
            📡 Radio del campus: {campusConfig.radio}m
          </Text>
        </View>

        <TouchableOpacity style={styles.mainBtn} onPress={verificarGPS} disabled={loading}>
          {loading
            ? <ActivityIndicator color={COLORS.white} />
            : <Text style={styles.mainBtnText}>📍 Verificar ubicación</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  // ── RENDER: Cámara ──
  if (phase === 'camera') return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => setPhase('gps')} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Verificación facial</Text>
        <View style={{ width: 80 }} />
      </View>

      <View style={styles.cameraIntroContent}>
        <View style={styles.cameraIntroCard}>
          <Text style={styles.cameraIntroEmoji}>👁️</Text>
          <Text style={styles.cameraIntroTitle}>Verificación rápida</Text>
          <Text style={styles.cameraIntroText}>
            Solo necesitas{' '}
            <Text style={styles.cameraIntroHighlight}>parpadear naturalmente</Text>
            {' '}frente a la cámara. El sistema verificará tu identidad automáticamente.
          </Text>
          <View style={styles.gpsConfirm}>
            <Text style={styles.gpsConfirmText}>✅ GPS verificado — Estás en el campus</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.mainBtn} onPress={() => setShowCamera(true)}>
          <Text style={styles.mainBtnText}>📸 Abrir verificación facial</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showCamera} animationType="slide" statusBarTranslucent>
        <View style={{ flex: 1 }}>
          <FaceCamera
            mode="session"
            storedFingerprint={user.foto_facial_registrada}
            onSuccess={handleFaceSuccess}
            onError={handleFaceError}
          />
          <TouchableOpacity style={styles.cancelCam} onPress={() => setShowCamera(false)}>
            <Text style={styles.cancelCamText}>✕ Cancelar</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.white} />
          <Text style={styles.loadingText}>Activando sesión...</Text>
        </View>
      )}
    </View>
  );

  // ── RENDER: Sesión activa ──
  const firmados = estudiantes.filter(e => e.firmado).length;
  const habilitados = estudiantes.filter(e => e.habilitado).length;
  const ahora = moment();
  const tardioActivo = sesion && ahora.isAfter(moment(sesion.ventana_normal_fin)) && ahora.isBefore(moment(sesion.ventana_tardio_fin));

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, styles.topBarGreen]}>
        <View>
          <Text style={styles.topBarTitle}>🟢 Sesión activa</Text>
          <Text style={styles.topBarSub}>{clase?.materia_nombre}</Text>
        </View>
        <TouchableOpacity onPress={cerrarSesion} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>Cerrar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.root}>
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { borderTopColor: COLORS.primary }]}>
            <Text style={styles.statNum}>{estudiantes.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statBox, { borderTopColor: COLORS.secondary }]}>
            <Text style={[styles.statNum, { color: COLORS.secondary }]}>{habilitados}</Text>
            <Text style={styles.statLabel}>Habilitados</Text>
          </View>
          <View style={[styles.statBox, { borderTopColor: COLORS.success }]}>
            <Text style={[styles.statNum, { color: COLORS.success }]}>{firmados}</Text>
            <Text style={styles.statLabel}>Firmaron</Text>
          </View>
        </View>

        {tardioActivo && (
          <View style={styles.tardioWarning}>
            <Text style={styles.tardioText}>⚠️ Ventana de tardíos activa — cierra a las {moment(sesion.ventana_tardio_fin).format('h:mm a')}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.habilitarTodosBtn} onPress={habilitarTodos}>
          <Text style={styles.habilitarTodosText}>👥 Habilitar a todos</Text>
        </TouchableOpacity>

        {estudiantes.map(est => (
          <View key={est.id} style={[styles.estCard, est.firmado && styles.estFirmado]}>
            <View style={styles.estAvatar}>
              <Text style={styles.estAvatarText}>{est.nombre.charAt(0)}</Text>
            </View>
            <View style={styles.estInfo}>
              <Text style={styles.estNombre}>{est.nombre}</Text>
              <Text style={styles.estCod}>{est.matricula}</Text>
              {est.firmado && <Text style={styles.estHora}>✅ {est.hora_firma}</Text>}
              {est.firmado_tardio && <Text style={styles.estTardio}>⏰ Tardío</Text>}
            </View>
            {!est.habilitado ? (
              <TouchableOpacity
                style={styles.habBtn}
                onPress={() => habilitarEst(est)}
                disabled={habilitando === est.id}
              >
                {habilitando === est.id
                  ? <ActivityIndicator color={COLORS.white} size="small" />
                  : <Text style={styles.habBtnText}>Habilitar</Text>
                }
              </TouchableOpacity>
            ) : (
              <View style={styles.habDone}>
                <Text style={styles.habDoneText}>{est.firmado ? '✅' : '🟢'}</Text>
              </View>
            )}
          </View>
        ))}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    backgroundColor: COLORS.primary, paddingTop: 52, paddingBottom: 16,
    paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  topBarGreen: { backgroundColor: '#1A6B3A' },
  topBarTitle: { ...FONTS.h3, color: COLORS.white },
  topBarSub: { ...FONTS.small, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.sm, paddingVertical: 6, paddingHorizontal: 12 },
  backBtnText: { ...FONTS.small, color: COLORS.white },
  closeBtn: { backgroundColor: COLORS.danger, borderRadius: RADIUS.sm, paddingVertical: 8, paddingHorizontal: 16 },
  closeBtnText: { ...FONTS.label, color: COLORS.white },
  content: { padding: 20, paddingBottom: 40 },
  claseCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 24,
    alignItems: 'center', marginBottom: 20, ...SHADOWS.medium,
  },
  claseIconBox: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  claseIcon: { fontSize: 32 },
  claseNombre: { ...FONTS.h3, color: COLORS.dark, textAlign: 'center', marginBottom: 12 },
  claseAula: { ...FONTS.small, color: COLORS.gray, marginBottom: 4 },
  claseHora: { ...FONTS.small, color: COLORS.secondary, marginBottom: 4 },
  claseCarrera: { ...FONTS.small, color: COLORS.gray },
  stepsCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 20,
    marginBottom: 16, ...SHADOWS.small,
  },
  stepsTitle: { ...FONTS.h4, color: COLORS.dark, marginBottom: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, gap: 14 },
  stepNum: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.grayLight, justifyContent: 'center', alignItems: 'center',
  },
  stepNumActive: { backgroundColor: COLORS.primary },
  stepNumText: { ...FONTS.label, color: COLORS.gray },
  stepNumTextActive: { color: COLORS.white },
  stepIcon: { ...FONTS.body, color: COLORS.dark },
  stepTitle2: { fontWeight: '600' },
  stepDesc: { ...FONTS.small, color: COLORS.gray, marginTop: 2 },
  stepInfo: { flex: 1 },
  campusInfo: {
    backgroundColor: '#EEF2FF', borderRadius: RADIUS.md,
    padding: 10, marginBottom: 16, alignItems: 'center',
  },
  campusInfoText: { ...FONTS.small, color: COLORS.primary },
  mainBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: 17, alignItems: 'center', ...SHADOWS.medium,
  },
  mainBtnText: { ...FONTS.h4, color: COLORS.white },
  cameraIntroContent: { flex: 1, padding: 20, justifyContent: 'center' },
  cameraIntroCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.xl, padding: 28,
    alignItems: 'center', marginBottom: 24, ...SHADOWS.medium,
  },
  cameraIntroEmoji: { fontSize: 60, marginBottom: 16 },
  cameraIntroTitle: { ...FONTS.h2, color: COLORS.dark, marginBottom: 12 },
  cameraIntroText: { ...FONTS.body, color: COLORS.gray, textAlign: 'center', lineHeight: 24 },
  cameraIntroHighlight: { color: COLORS.primary, fontWeight: '700' },
  gpsConfirm: {
    backgroundColor: COLORS.successLight, borderRadius: RADIUS.md,
    paddingVertical: 10, paddingHorizontal: 16, marginTop: 16,
  },
  gpsConfirmText: { ...FONTS.small, color: COLORS.success, fontWeight: '600' },
  cancelCam: {
    position: 'absolute', bottom: 40, left: 20, right: 20,
    backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: RADIUS.md,
    padding: 16, alignItems: 'center',
  },
  cancelCamText: { ...FONTS.h4, color: COLORS.white },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,36,99,0.85)',
    justifyContent: 'center', alignItems: 'center',
  },
  loadingText: { ...FONTS.h4, color: COLORS.white, marginTop: 16 },
  statsRow: { flexDirection: 'row', gap: 10, padding: 16 },
  statBox: {
    flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.md,
    padding: 14, alignItems: 'center', borderTopWidth: 3, ...SHADOWS.small,
  },
  statNum: { ...FONTS.h2, color: COLORS.primary },
  statLabel: { ...FONTS.tiny, color: COLORS.gray, marginTop: 2 },
  tardioWarning: {
    backgroundColor: COLORS.warningLight, marginHorizontal: 16, borderRadius: RADIUS.md,
    padding: 12, borderLeftWidth: 3, borderLeftColor: COLORS.warning,
  },
  tardioText: { ...FONTS.small, color: '#7D5A2A' },
  habilitarTodosBtn: {
    backgroundColor: COLORS.secondary, marginHorizontal: 16, marginVertical: 12,
    borderRadius: RADIUS.md, padding: 14, alignItems: 'center', ...SHADOWS.small,
  },
  habilitarTodosText: { ...FONTS.h4, color: COLORS.white },
  estCard: {
    backgroundColor: COLORS.white, marginHorizontal: 16, marginBottom: 8,
    borderRadius: RADIUS.md, padding: 14, flexDirection: 'row',
    alignItems: 'center', ...SHADOWS.small,
  },
  estFirmado: { opacity: 0.75 },
  estAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  estAvatarText: { ...FONTS.h4, color: COLORS.white },
  estInfo: { flex: 1 },
  estNombre: { ...FONTS.body, color: COLORS.dark, fontWeight: '600' },
  estCod: { ...FONTS.small, color: COLORS.gray },
  estHora: { ...FONTS.tiny, color: COLORS.success, marginTop: 2 },
  estTardio: { ...FONTS.tiny, color: COLORS.warning },
  habBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.sm,
    paddingVertical: 8, paddingHorizontal: 14,
  },
  habBtnText: { ...FONTS.small, color: COLORS.white, fontWeight: '700' },
  habDone: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.grayLight, justifyContent: 'center', alignItems: 'center',
  },
  habDoneText: { fontSize: 18 },
});
