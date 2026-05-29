import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { profesorService } from '../../services/services';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../../utils/theme';
import { StatCard, StatusBadge } from '../../components/UIComponents';
import moment from 'moment';
import 'moment/locale/es';
import api from '../../services/api';
moment.locale('es');

// ══════════════════════════════════════════
// HOME PROFESOR
// ══════════════════════════════════════════
export function ProfesorHomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [clases, setClases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sesionActiva, setSesionActiva] = useState(null);

  useEffect(() => {
    load();
    // Revisar si hay sesión activa cada 30 segundos
    const t = setInterval(checkSesionActiva, 30000);
    return () => clearInterval(t);
  }, []);

  const load = async () => {
    try {
      const r = await profesorService.getCargaAcademica(user.profesor_id, user.semestre_activo);
      setClases(r.data);
      await checkSesionActiva();
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  const checkSesionActiva = async () => {
    try {
      const r = await api.get(`/sesion/activa-profesor/${user.profesor_id}`);
      setSesionActiva(r.data || null);
    } catch {
      setSesionActiva(null);
    }
  };

  const hoy = moment().format('dddd').toLowerCase();
  const clasesHoy = clases.filter(c => c.dias_semana?.toLowerCase().includes(hoy));

  const getClaseEstado = (c) => {
    const inicio = moment(c.horario_inicio, 'HH:mm');
    const fin = moment(c.horario_fin, 'HH:mm');
    const ahora = moment();
    if (ahora.isBetween(inicio, fin)) return 'activa';
    if (ahora.isBefore(inicio)) return 'proxima';
    return 'pasada';
  };

  const ClaseCard = ({ item }) => {
    const estado = getClaseEstado(item);
    return (
      <TouchableOpacity
        style={[styles.claseCard, estado === 'activa' && styles.claseCardActiva]}
        onPress={() => navigation.navigate('Activar', { clase: item })}
        activeOpacity={0.85}
      >
        <View style={styles.claseCardLeft}>
          <View style={[styles.claseHoraBox, estado === 'activa' && { backgroundColor: COLORS.success }]}>
            <Text style={styles.claseHoraText}>{item.horario_inicio}</Text>
            <Text style={styles.claseHoraDiv}>—</Text>
            <Text style={styles.claseHoraText}>{item.horario_fin}</Text>
          </View>
        </View>
        <View style={styles.claseCardBody}>
          <View style={styles.claseNameRow}>
            <Text style={styles.claseNombre} numberOfLines={1}>{item.materia_nombre}</Text>
            {estado === 'activa' && <View style={styles.enCursoBadge}><Text style={styles.enCursoBadgeText}>EN CURSO</Text></View>}
            {estado === 'proxima' && <View style={styles.proximaBadge}><Text style={styles.proximaBadgeText}>PRÓXIMA</Text></View>}
          </View>
          <Text style={styles.claseAula}>📍 {item.aula}</Text>
          <Text style={styles.claseCarrera}>🎓 {item.carrera_nombre}</Text>
        </View>
        <Text style={styles.claseArrow}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={styles.root}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bienvenido,</Text>
          <Text style={styles.nombre}>{user.nombre.split(' ')[0]}</Text>
          <Text style={styles.fecha}>{moment().format('dddd D [de] MMMM')}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}><Text style={styles.logoutText}>Salir</Text></TouchableOpacity>
      </View>

      {/* ── Banner sesión activa ── */}
      {sesionActiva && (
        <TouchableOpacity
          style={styles.sesionActivaBanner}
          onPress={() => {
            const claseActiva = clases.find(c => c.id === sesionActiva.carga_academica_id);
            navigation.navigate('Activar', { clase: claseActiva || { id: sesionActiva.carga_academica_id, materia_nombre: sesionActiva.materia_nombre || 'Clase activa' } });
          }}
          activeOpacity={0.85}
        >
          <View style={styles.sesionActivaLeft}>
            <View style={styles.sesionActivaDot} />
            <View>
              <Text style={styles.sesionActivaTitle}>🟢 Sesión activa en curso</Text>
              <Text style={styles.sesionActivaSub}>Toca para volver a la sesión</Text>
            </View>
          </View>
          <Text style={styles.sesionActivaArrow}>›</Text>
        </TouchableOpacity>
      )}

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatCard value={user.clases_dadas || 0} label="Clases dadas" color={COLORS.primary} icon="📚" />
        <StatCard value={user.tardios || 0} label="Tardíos" color={COLORS.warning} icon="⏰" />
        <StatCard value={user.inasistencias || 0} label="Faltas" color={COLORS.danger} icon="❌" />
      </View>

      {/* Clases hoy */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Clases de hoy — <Text style={styles.sectionTitleAlt}>{moment().format('dddd')}</Text>
        </Text>
        {loading ? <ActivityIndicator color={COLORS.primary} />
          : clasesHoy.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🌟</Text>
              <Text style={styles.emptyText}>No tienes clases hoy</Text>
            </View>
          ) : clasesHoy.map(c => <ClaseCard key={c.id} item={c} />)
        }
      </View>

      {/* Todas las materias */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Todas mis materias</Text>
        {clases.map(c => <ClaseCard key={c.id} item={c} />)}
      </View>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

// ══════════════════════════════════════════
// HISTORIAL PROFESOR
// ══════════════════════════════════════════
export function ProfesorHistorialScreen({ navigation }) {
  const { user } = useAuth();
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [corte, setCorte] = useState(1);

  useEffect(() => {
    profesorService.getHistorial(user.profesor_id).then(r => { setHistorial(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const data = historial.filter(h => h.corte === corte);
  const presentes = data.filter(h => h.estado === 'presente').length;
  const tardios = data.filter(h => h.estado === 'tardio').length;
  const ausentes = data.filter(h => h.estado === 'ausente').length;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}><Text style={styles.backCircleText}>←</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Mi historial</Text>
        <View style={{ width: 36 }} />
      </View>
      <View style={styles.cortesRow}>
        {[1, 2, 3].map(c => (
          <TouchableOpacity key={c} style={[styles.corteBtn, corte === c && styles.corteBtnOn]} onPress={() => setCorte(c)}>
            <Text style={[styles.corteBtnText, corte === c && styles.corteBtnTextOn]}>Corte {c}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.miniStats}>
        <View style={[styles.miniStat, { backgroundColor: COLORS.success }]}><Text style={styles.miniStatNum}>{presentes}</Text><Text style={styles.miniStatLabel}>Presentes</Text></View>
        <View style={[styles.miniStat, { backgroundColor: COLORS.warning }]}><Text style={styles.miniStatNum}>{tardios}</Text><Text style={styles.miniStatLabel}>Tardíos</Text></View>
        <View style={[styles.miniStat, { backgroundColor: COLORS.danger }]}><Text style={styles.miniStatNum}>{ausentes}</Text><Text style={styles.miniStatLabel}>Ausentes</Text></View>
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
                <Text style={styles.histFecha}>{moment(item.fecha).format('dddd D [de] MMMM')}</Text>
                {item.minutos_retraso > 0 && <Text style={styles.histRetraso}>⏰ {item.minutos_retraso} min tarde</Text>}
                {item.duracion_real_minutos && <Text style={styles.histDuracion}>📊 {item.duracion_real_minutos} min de clase</Text>}
                {item.justificacion && <Text style={styles.histJustif}>📝 {item.justificacion}</Text>}
              </View>
            </View>
          )}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<View style={styles.emptyCard}><Text style={styles.emptyText}>Sin registros en este corte</Text></View>}
        />
      )}
    </View>
  );
}

// ══════════════════════════════════════════
// ESTADÍSTICAS PROFESOR
// ══════════════════════════════════════════
export function ProfesorEstadisticasScreen({ navigation }) {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    profesorService.getEstadisticas(user.profesor_id).then(r => { setStats(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator color={COLORS.primary} style={{ flex: 1, marginTop: 100 }} />;

  return (
    <ScrollView style={styles.root}>
      <View style={[styles.header, { paddingBottom: 24 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}><Text style={styles.backCircleText}>←</Text></TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Mis estadísticas</Text>
          <Text style={styles.headerSub}>Semestre actual</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>
      {[1, 2, 3].map(c => {
        const d = stats?.[`corte${c}`] || {};
        const pct = d.porcentaje || 0;
        const color = pct >= 80 ? COLORS.success : pct >= 60 ? COLORS.warning : COLORS.danger;
        return (
          <View key={c} style={styles.corteEstCard}>
            <View style={styles.corteEstHeader}>
              <Text style={styles.corteEstTitle}>Corte {c}</Text>
              <Text style={[styles.corteEstPct, { color }]}>{pct}% asistencia</Text>
            </View>
            <View style={styles.corteEstStats}>
              <View style={[styles.corteEstStat, { borderColor: COLORS.success }]}><Text style={[styles.corteEstNum, { color: COLORS.success }]}>{d.presentes || 0}</Text><Text style={styles.corteEstLabel}>Presentes</Text></View>
              <View style={[styles.corteEstStat, { borderColor: COLORS.warning }]}><Text style={[styles.corteEstNum, { color: COLORS.warning }]}>{d.tardios || 0}</Text><Text style={styles.corteEstLabel}>Tardíos</Text></View>
              <View style={[styles.corteEstStat, { borderColor: COLORS.danger }]}><Text style={[styles.corteEstNum, { color: COLORS.danger }]}>{d.ausentes || 0}</Text><Text style={styles.corteEstLabel}>Ausentes</Text></View>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
            </View>
          </View>
        );
      })}
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary, paddingTop: 52, paddingBottom: 20,
    paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { ...FONTS.h3, color: COLORS.white },
  headerSub: { ...FONTS.tiny, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  backCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  backCircleText: { fontSize: 20, color: COLORS.white },
  greeting: { ...FONTS.small, color: 'rgba(255,255,255,0.7)' },
  nombre: { ...FONTS.h1, color: COLORS.white },
  fecha: { ...FONTS.tiny, color: 'rgba(255,255,255,0.6)', marginTop: 4, textTransform: 'capitalize' },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.sm, paddingVertical: 8, paddingHorizontal: 12 },
  logoutText: { ...FONTS.small, color: COLORS.white },
  sesionActivaBanner: {
    backgroundColor: '#1A6B3A', marginHorizontal: 16, marginTop: 12,
    borderRadius: RADIUS.lg, padding: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between', ...SHADOWS.medium,
  },
  sesionActivaLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sesionActivaDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#4ADE80',
    shadowColor: '#4ADE80', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 4,
  },
  sesionActivaTitle: { ...FONTS.body, color: COLORS.white, fontWeight: '700' },
  sesionActivaSub: { ...FONTS.tiny, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  sesionActivaArrow: { fontSize: 24, color: 'rgba(255,255,255,0.7)' },
  statsRow: { flexDirection: 'row', gap: 10, padding: 16 },
  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { ...FONTS.h4, color: COLORS.dark, marginBottom: 12 },
  sectionTitleAlt: { color: COLORS.secondary, textTransform: 'capitalize' },
  claseCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 10, ...SHADOWS.small,
  },
  claseCardActiva: { borderWidth: 2, borderColor: COLORS.success },
  claseCardLeft: { marginRight: 14 },
  claseHoraBox: {
    backgroundColor: '#EEF2FF', borderRadius: RADIUS.md,
    padding: 10, alignItems: 'center', minWidth: 64,
  },
  claseHoraText: { ...FONTS.tiny, color: COLORS.primary, fontWeight: '700' },
  claseHoraDiv: { ...FONTS.tiny, color: COLORS.gray },
  claseCardBody: { flex: 1 },
  claseNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  claseNombre: { ...FONTS.body, color: COLORS.dark, fontWeight: '700', flex: 1 },
  enCursoBadge: { backgroundColor: COLORS.success, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  enCursoBadgeText: { ...FONTS.tiny, color: COLORS.white, fontWeight: '800' },
  proximaBadge: { backgroundColor: COLORS.warningLight, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  proximaBadgeText: { ...FONTS.tiny, color: COLORS.warning, fontWeight: '700' },
  claseAula: { ...FONTS.small, color: COLORS.gray },
  claseCarrera: { ...FONTS.tiny, color: COLORS.gray, marginTop: 2 },
  claseArrow: { fontSize: 24, color: COLORS.grayLight },
  emptyCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 32, alignItems: 'center', ...SHADOWS.small },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { ...FONTS.body, color: COLORS.gray },
  cortesRow: { flexDirection: 'row', padding: 16, gap: 10 },
  corteBtn: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, backgroundColor: COLORS.white, alignItems: 'center', ...SHADOWS.small },
  corteBtnOn: { backgroundColor: COLORS.primary },
  corteBtnText: { ...FONTS.small, color: COLORS.gray, fontWeight: '600' },
  corteBtnTextOn: { color: COLORS.white },
  miniStats: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 4 },
  miniStat: { flex: 1, borderRadius: RADIUS.md, padding: 12, alignItems: 'center' },
  miniStatNum: { ...FONTS.h3, color: COLORS.white },
  miniStatLabel: { ...FONTS.tiny, color: 'rgba(255,255,255,0.85)' },
  histItem: { backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 12, ...SHADOWS.small },
  histMateria: { ...FONTS.body, color: COLORS.dark, fontWeight: '600' },
  histFecha: { ...FONTS.small, color: COLORS.gray, marginTop: 2, textTransform: 'capitalize' },
  histRetraso: { ...FONTS.tiny, color: COLORS.warning, marginTop: 2 },
  histDuracion: { ...FONTS.tiny, color: COLORS.secondary, marginTop: 2 },
  histJustif: { ...FONTS.tiny, color: COLORS.success, marginTop: 2 },
  corteEstCard: { backgroundColor: COLORS.white, marginHorizontal: 16, marginBottom: 14, borderRadius: RADIUS.lg, padding: 20, ...SHADOWS.small },
  corteEstHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  corteEstTitle: { ...FONTS.h4, color: COLORS.dark },
  corteEstPct: { ...FONTS.h4 },
  corteEstStats: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  corteEstStat: { flex: 1, borderRadius: RADIUS.md, padding: 12, alignItems: 'center', borderWidth: 2, backgroundColor: COLORS.background },
  corteEstNum: { ...FONTS.h3 },
  corteEstLabel: { ...FONTS.tiny, color: COLORS.gray },
  progressTrack: { height: 8, backgroundColor: COLORS.grayLight, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
});
