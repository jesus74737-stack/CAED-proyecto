import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList,
  TouchableOpacity, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { estudianteService, locationService } from '../../services/services';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../../utils/theme';
import { StatusBadge } from '../../components/UIComponents';
import Toast from 'react-native-toast-message';
import moment from 'moment';
import 'moment/locale/es';
import api from '../../services/api';
moment.locale('es');

const CAMPUS_DEFAULT = { latitude: 11.5140459, longitude: -72.8691971, radio: 2000 };

export function EstudianteHomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [sesiones, setSesiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  const load = async () => {
    try { const r = await estudianteService.getSesionesActivas(); setSesiones(r.data); }
    catch {} finally { setLoading(false); setRefreshing(false); }
  };

  const SesionCard = ({ item }) => {
    const firmado = !!item.hora_firma;
    const habilitado = item.habilitado && !firmado;
    return (
      <View style={[styles.sesionCard, firmado && styles.sesionFirmada, habilitado && styles.sesionHabilitada]}>
        <View style={styles.sesionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sesionMateria}>{item.materia_nombre}</Text>
            <Text style={styles.sesionProfesor}>👨‍🏫 {item.profesor_nombre}</Text>
            <Text style={styles.sesionAula}>📍 {item.aula}</Text>
          </View>
          <View style={styles.sesionStatus}>
            {firmado ? <View style={styles.firmadoTag}><Text style={styles.firmadoTagText}>✅ Firmado</Text></View>
              : habilitado ? <View style={styles.habTag}><Text style={styles.habTagText}>🟢 Activo</Text></View>
              : <View style={styles.esperaTag}><Text style={styles.esperaTagText}>⏳ Espera</Text></View>
            }
          </View>
        </View>
        {firmado && <Text style={styles.horaFirmaText}>Firmaste a las {item.hora_firma}</Text>}
        {item.es_tardio && !firmado && <Text style={styles.tardioWarn}>⚠️ Ventana de tardíos activa</Text>}
        {habilitado && (
          <TouchableOpacity style={styles.firmarBtn} onPress={() => navigation.navigate('Firmar', { sesion: item })}>
            <Text style={styles.firmarBtnText}>✍️ Firmar asistencia ahora</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.root} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola,</Text>
          <Text style={styles.nombre}>{user.nombre.split(' ')[0]}</Text>
          <Text style={styles.fecha}>{moment().format('dddd D [de] MMMM')}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}><Text style={styles.logoutText}>Salir</Text></TouchableOpacity>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sesiones activas hoy</Text>
        {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
          : sesiones.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>📚</Text>
              <Text style={styles.emptyText}>No hay sesiones activas en este momento</Text>
              <Text style={styles.emptySubText}>Espera a que tu profesor active la clase</Text>
            </View>
          ) : sesiones.map(s => <SesionCard key={s.id} item={s} />)
        }
      </View>
    </ScrollView>
  );
}

export function FirmarAsistenciaScreen({ route, navigation }) {
  const { sesion } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [campusConfig, setCampusConfig] = useState(CAMPUS_DEFAULT);

  useEffect(() => {
    const cargarCampus = async () => {
      try {
        const res = await api.get('/admin/campus-config');
        setCampusConfig(res.data);
      } catch {}
    };
    cargarCampus();
  }, []);

  const firmar = async () => {
    setVerificando(true);
    try {
      const coords = await locationService.getCurrentLocation();
      const campusCoords = { latitude: campusConfig.latitude, longitude: campusConfig.longitude };
      const dentro = locationService.isInsideCampus(coords, campusCoords, campusConfig.radio);
      if (!dentro) {
        Alert.alert('📍 Fuera del campus', 'Debes estar físicamente dentro del campus para firmar la asistencia.');
        return;
      }
      setVerificando(false);
      setLoading(true);
      // ── Fix: coordenadas como string, no como objeto ──
      await estudianteService.firmarAsistencia(sesion.id, `${coords.latitude},${coords.longitude}`);
      Toast.show({ type: 'success', text1: '✅ Asistencia firmada correctamente' });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'No se pudo firmar la asistencia');
    } finally {
      setLoading(false);
      setVerificando(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}><Text style={styles.backCircleText}>←</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Firmar asistencia</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView contentContainerStyle={styles.firmarContent}>
        <View style={styles.firmarCard}>
          <View style={styles.firmarIconBox}><Text style={styles.firmarIcon}>✍️</Text></View>
          <Text style={styles.firmarMateria}>{sesion?.materia_nombre}</Text>
          <Text style={styles.firmarProfesor}>👨‍🏫 {sesion?.profesor_nombre}</Text>
          <Text style={styles.firmarAula}>📍 {sesion?.aula}</Text>
          {sesion?.es_tardio && (
            <View style={styles.tardioBox}>
              <Text style={styles.tardioBoxText}>⚠️ Estás firmando en la ventana de tardíos. Quedará registrado como Tardío.</Text>
            </View>
          )}
          <View style={styles.firmarInfoBox}>
            <Text style={styles.firmarInfoTitle}>¿Cómo funciona?</Text>
            <Text style={styles.firmarInfoItem}>📍 Se verificará tu ubicación GPS</Text>
            <Text style={styles.firmarInfoItem}>✅ Debes estar dentro del campus</Text>
            <Text style={styles.firmarInfoItem}>📝 Se registrará la hora exacta</Text>
          </View>
          <View style={styles.campusInfo}>
            <Text style={styles.campusInfoText}>📡 Radio del campus: {campusConfig.radio}m</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.firmarBtn2, (loading || verificando) && styles.firmarBtnDisabled]}
          onPress={firmar}
          disabled={loading || verificando}
        >
          {verificando ? <><ActivityIndicator color={COLORS.white} size="small" /><Text style={styles.firmarBtnText2}>  Verificando ubicación...</Text></>
            : loading ? <><ActivityIndicator color={COLORS.white} size="small" /><Text style={styles.firmarBtnText2}>  Firmando...</Text></>
            : <Text style={styles.firmarBtnText2}>📍 Verificar ubicación y firmar</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

export function EstudianteHistorialScreen({ navigation }) {
  const { user } = useAuth();
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [corte, setCorte] = useState(1);

  useEffect(() => {
    estudianteService.getHistorial(user.estudiante_id).then(r => { setHistorial(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const data = historial.filter(h => h.corte === corte);
  const presentes = data.filter(h => h.estado === 'presente').length;
  const tardios = data.filter(h => h.estado === 'tardio').length;
  const ausentes = data.filter(h => h.estado === 'ausente').length;
  const pct = data.length ? Math.round((presentes + tardios) / data.length * 100) : 0;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}><Text style={styles.backCircleText}>←</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Mi asistencia</Text>
        <View style={{ width: 36 }} />
      </View>
      <View style={styles.cortesRow}>
        {[1, 2, 3].map(c => (
          <TouchableOpacity key={c} style={[styles.corteBtn, corte === c && styles.corteBtnOn]} onPress={() => setCorte(c)}>
            <Text style={[styles.corteBtnText, corte === c && styles.corteBtnTextOn]}>Corte {c}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.pctCard}>
        <Text style={styles.pctNum}>{pct}%</Text>
        <Text style={styles.pctLabel}>de asistencia en corte {corte}</Text>
        <View style={styles.pctBar}><View style={[styles.pctFill, { width: `${pct}%`, backgroundColor: pct >= 80 ? COLORS.success : pct >= 60 ? COLORS.warning : COLORS.danger }]} /></View>
        <View style={styles.pctStats}>
          <Text style={[styles.pctStat, { color: COLORS.success }]}>✅ {presentes} presentes</Text>
          <Text style={[styles.pctStat, { color: COLORS.warning }]}>⏰ {tardios} tardíos</Text>
          <Text style={[styles.pctStat, { color: COLORS.danger }]}>❌ {ausentes} ausentes</Text>
        </View>
      </View>
      {loading ? <ActivityIndicator color={COLORS.primary} style={{ flex: 1 }} /> : (
        <FlatList
          data={data}
          keyExtractor={i => i.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.histItem}>
              <StatusBadge status={item.estado} />
              <View style={{ flex: 1 }}>
                <Text style={styles.histMateria}>{item.materia_nombre}</Text>
                <Text style={styles.histProfesor}>👨‍🏫 {item.profesor_nombre}</Text>
                <Text style={styles.histFecha}>{moment(item.fecha).format('ddd D MMM')}</Text>
              </View>
              {item.hora_firma && <Text style={styles.histHora}>{item.hora_firma}</Text>}
            </View>
          )}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary, paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { ...FONTS.h3, color: COLORS.white },
  backCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  backCircleText: { fontSize: 20, color: COLORS.white },
  greeting: { ...FONTS.small, color: 'rgba(255,255,255,0.7)' },
  nombre: { ...FONTS.h1, color: COLORS.white },
  fecha: { ...FONTS.tiny, color: 'rgba(255,255,255,0.6)', marginTop: 4, textTransform: 'capitalize' },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.sm, paddingVertical: 8, paddingHorizontal: 12 },
  logoutText: { ...FONTS.small, color: COLORS.white },
  section: { padding: 16 },
  sectionTitle: { ...FONTS.h4, color: COLORS.dark, marginBottom: 12 },
  emptyCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 32, alignItems: 'center', ...SHADOWS.small },
  emptyText: { ...FONTS.body, color: COLORS.dark, fontWeight: '600', textAlign: 'center' },
  emptySubText: { ...FONTS.small, color: COLORS.gray, marginTop: 4, textAlign: 'center' },
  sesionCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 16, marginBottom: 12, ...SHADOWS.small },
  sesionFirmada: { opacity: 0.7 },
  sesionHabilitada: { borderWidth: 2, borderColor: COLORS.success },
  sesionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  sesionMateria: { ...FONTS.h4, color: COLORS.dark },
  sesionProfesor: { ...FONTS.small, color: COLORS.gray, marginTop: 4 },
  sesionAula: { ...FONTS.small, color: COLORS.gray },
  sesionStatus: { alignItems: 'flex-end' },
  firmadoTag: { backgroundColor: COLORS.successLight, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  firmadoTagText: { ...FONTS.tiny, color: COLORS.success, fontWeight: '700' },
  habTag: { backgroundColor: COLORS.successLight, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  habTagText: { ...FONTS.tiny, color: COLORS.success, fontWeight: '700' },
  esperaTag: { backgroundColor: COLORS.grayLight, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  esperaTagText: { ...FONTS.tiny, color: COLORS.gray, fontWeight: '700' },
  horaFirmaText: { ...FONTS.tiny, color: COLORS.success, marginTop: 4 },
  tardioWarn: { ...FONTS.tiny, color: COLORS.warning, marginTop: 4 },
  firmarBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 14, alignItems: 'center', marginTop: 12, ...SHADOWS.small },
  firmarBtnText: { ...FONTS.label, color: COLORS.white },
  firmarContent: { padding: 20, paddingBottom: 40 },
  firmarCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.xl, padding: 24, alignItems: 'center', marginBottom: 20, ...SHADOWS.medium },
  firmarIconBox: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  firmarIcon: { fontSize: 40 },
  firmarMateria: { ...FONTS.h3, color: COLORS.dark, textAlign: 'center', marginBottom: 8 },
  firmarProfesor: { ...FONTS.small, color: COLORS.gray, marginBottom: 4 },
  firmarAula: { ...FONTS.small, color: COLORS.gray, marginBottom: 16 },
  tardioBox: { backgroundColor: COLORS.warningLight, borderRadius: RADIUS.md, padding: 12, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: COLORS.warning },
  tardioBoxText: { ...FONTS.small, color: '#7D5A2A', lineHeight: 20 },
  firmarInfoBox: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: 16, width: '100%', gap: 8 },
  firmarInfoTitle: { ...FONTS.label, color: COLORS.dark, marginBottom: 4 },
  firmarInfoItem: { ...FONTS.small, color: COLORS.gray },
  campusInfo: { backgroundColor: '#EEF2FF', borderRadius: RADIUS.md, padding: 10, marginTop: 12, width: '100%', alignItems: 'center' },
  campusInfoText: { ...FONTS.small, color: COLORS.primary },
  firmarBtn2: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 17, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', ...SHADOWS.medium },
  firmarBtnDisabled: { backgroundColor: COLORS.gray },
  firmarBtnText2: { ...FONTS.h4, color: COLORS.white },
  cortesRow: { flexDirection: 'row', padding: 16, gap: 10 },
  corteBtn: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, backgroundColor: COLORS.white, alignItems: 'center', ...SHADOWS.small },
  corteBtnOn: { backgroundColor: COLORS.primary },
  corteBtnText: { ...FONTS.small, color: COLORS.gray, fontWeight: '600' },
  corteBtnTextOn: { color: COLORS.white },
  pctCard: { backgroundColor: COLORS.white, marginHorizontal: 16, borderRadius: RADIUS.lg, padding: 20, alignItems: 'center', marginBottom: 4, ...SHADOWS.small },
  pctNum: { ...FONTS.h1, color: COLORS.primary },
  pctLabel: { ...FONTS.small, color: COLORS.gray, marginBottom: 16 },
  pctBar: { width: '100%', height: 10, backgroundColor: COLORS.grayLight, borderRadius: 5, overflow: 'hidden', marginBottom: 12 },
  pctFill: { height: 10, borderRadius: 5 },
  pctStats: { flexDirection: 'row', gap: 16 },
  pctStat: { ...FONTS.small, fontWeight: '700' },
  histItem: { backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12, ...SHADOWS.small },
  histMateria: { ...FONTS.body, color: COLORS.dark, fontWeight: '600' },
  histProfesor: { ...FONTS.tiny, color: COLORS.gray, marginTop: 2 },
  histFecha: { ...FONTS.tiny, color: COLORS.gray, textTransform: 'capitalize' },
  histHora: { ...FONTS.small, color: COLORS.secondary },
});
