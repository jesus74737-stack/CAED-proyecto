import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services/services';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../../utils/theme';
import { StatCard, AlertBanner } from '../../components/UIComponents';
import moment from 'moment';
import 'moment/locale/es';
moment.locale('es');

export default function AdminHomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await adminService.getAlertas();
      setData(res.data);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) return (
    <View style={styles.loadingScreen}>
      <ActivityIndicator color={COLORS.white} size="large" />
    </View>
  );

  return (
    <ScrollView
      style={styles.root}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Panel de administración</Text>
          <Text style={styles.nombre}>{user.nombre}</Text>
          <Text style={styles.fecha}>{moment().format('dddd D [de] MMMM, YYYY')}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* Solicitudes pendientes */}
      {data?.registros_pendientes > 0 && (
        <TouchableOpacity
          style={styles.pendienteBanner}
          onPress={() => navigation.navigate('Registros')}
        >
          <Text style={styles.pendienteIcon}>🔔</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.pendienteTitle}>Solicitudes de acceso pendientes</Text>
            <Text style={styles.pendienteDesc}>{data.registros_pendientes} usuario{data.registros_pendientes !== 1 ? 's' : ''} esperando aprobación</Text>
          </View>
          <Text style={styles.pendienteArrow}>→</Text>
        </TouchableOpacity>
      )}

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatCard value={data?.total_profesores || 0} label="Profesores" color={COLORS.primary} icon="👨‍🏫" />
        <StatCard value={data?.profesores_en_alerta || 0} label="En alerta" color={COLORS.danger} icon="🚨" />
        <StatCard value={`${data?.porcentaje_asistencia || 0}%`} label="Asistencia" color={COLORS.success} icon="✅" />
      </View>

      {/* Alertas hoy */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🚨 Alertas de hoy</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Alertas')}>
            <Text style={styles.sectionLink}>Ver todas →</Text>
          </TouchableOpacity>
        </View>
        {!data?.alertas_hoy?.length ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyText}>Sin alertas por ahora</Text>
          </View>
        ) : data.alertas_hoy.slice(0, 3).map(a => (
          <TouchableOpacity
            key={a.id}
            style={styles.alertaCard}
            onPress={() => navigation.navigate('ProfesorDetalle', { profesorId: a.profesor_id })}
          >
            <View style={styles.alertaDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.alertaNombre}>{a.profesor_nombre}</Text>
              <Text style={styles.alertaDesc}>{a.descripcion}</Text>
              <Text style={styles.alertaHora}>{moment(a.fecha_generacion).fromNow()}</Text>
            </View>
            <Text style={styles.alertaArrow}>→</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Accesos rápidos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accesos rápidos</Text>
        <View style={styles.quickGrid}>
          {[
            { icon: '🏆', label: 'Ranking', nav: 'Ranking', color: '#FFF3E0' },
            { icon: '📊', label: 'Estadísticas', nav: 'Estadísticas', color: '#E8F5E9' },
            { icon: '👥', label: 'Profesores', nav: 'Profesores', color: '#E3F2FD' },
            { icon: '📋', label: 'Solicitudes', nav: 'Registros', color: '#F3E5F5' },
          ].map(q => (
            <TouchableOpacity
              key={q.label}
              style={[styles.quickCard, { backgroundColor: q.color }]}
              onPress={() => navigation.navigate(q.nav)}
            >
              <Text style={styles.quickIcon}>{q.icon}</Text>
              <Text style={styles.quickLabel}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  loadingScreen: { flex: 1, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: COLORS.primary, paddingTop: 52, paddingBottom: 24,
    paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  greeting: { ...FONTS.small, color: 'rgba(255,255,255,0.7)' },
  nombre: { ...FONTS.h2, color: COLORS.white, marginTop: 2 },
  fecha: { ...FONTS.tiny, color: 'rgba(255,255,255,0.6)', marginTop: 4, textTransform: 'capitalize' },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.sm, paddingVertical: 8, paddingHorizontal: 14, marginTop: 4 },
  logoutText: { ...FONTS.small, color: COLORS.white },
  pendienteBanner: {
    backgroundColor: COLORS.warning, marginHorizontal: 16, marginTop: 16,
    borderRadius: RADIUS.lg, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, ...SHADOWS.medium,
  },
  pendienteIcon: { fontSize: 28 },
  pendienteTitle: { ...FONTS.h4, color: COLORS.white },
  pendienteDesc: { ...FONTS.small, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  pendienteArrow: { ...FONTS.h3, color: COLORS.white },
  statsRow: { flexDirection: 'row', gap: 10, padding: 16 },
  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { ...FONTS.h4, color: COLORS.dark },
  sectionLink: { ...FONTS.small, color: COLORS.secondary, fontWeight: '700' },
  emptyCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 24, alignItems: 'center', ...SHADOWS.small },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { ...FONTS.body, color: COLORS.gray },
  alertaCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 8, ...SHADOWS.small,
    borderLeftWidth: 4, borderLeftColor: COLORS.danger,
  },
  alertaDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.danger, marginRight: 12 },
  alertaNombre: { ...FONTS.body, color: COLORS.dark, fontWeight: '600' },
  alertaDesc: { ...FONTS.small, color: COLORS.gray, marginTop: 2 },
  alertaHora: { ...FONTS.tiny, color: COLORS.gray, marginTop: 4 },
  alertaArrow: { ...FONTS.body, color: COLORS.gray },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  quickCard: { width: '47%', borderRadius: RADIUS.lg, padding: 20, alignItems: 'center', ...SHADOWS.small },
  quickIcon: { fontSize: 32, marginBottom: 8 },
  quickLabel: { ...FONTS.body, color: COLORS.dark, fontWeight: '600' },
});
