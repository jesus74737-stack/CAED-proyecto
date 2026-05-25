import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, Image, ScrollView,
} from 'react-native';
import { adminService } from '../../services/services';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../../utils/theme';
import { Avatar, StatusBadge, AlertBanner } from '../../components/UIComponents';
import Toast from 'react-native-toast-message';
import moment from 'moment';

export default function AdminRegistrosScreen({ navigation }) {
  const [pendientes, setPendientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(null);
  const [tab, setTab] = useState('pendiente'); // pendiente | aprobado | rechazado

  useEffect(() => { loadRegistros(); }, [tab]);

  const loadRegistros = async () => {
    setLoading(true);
    try {
      const res = await adminService.getRegistrosPendientes(tab);
      setPendientes(res.data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const aprobar = async (usuario) => {
    Alert.alert(
      '✅ Aprobar registro',
      `¿Deseas aprobar el acceso de ${usuario.nombre} como ${usuario.rol}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprobar', onPress: async () => {
            setProcesando(usuario.id);
            try {
              await adminService.aprobarRegistro(usuario.id);
              Toast.show({ type: 'success', text1: `✅ ${usuario.nombre} aprobado` });
              loadRegistros();
            } catch {
              Alert.alert('Error', 'No se pudo aprobar el registro');
            } finally {
              setProcesando(null);
            }
          }
        }
      ]
    );
  };

  const rechazar = async (usuario) => {
    Alert.alert(
      '❌ Rechazar registro',
      `¿Rechazar la solicitud de ${usuario.nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rechazar', style: 'destructive', onPress: async () => {
            setProcesando(usuario.id);
            try {
              await adminService.rechazarRegistro(usuario.id);
              Toast.show({ type: 'error', text1: `❌ ${usuario.nombre} rechazado` });
              loadRegistros();
            } catch {
              Alert.alert('Error', 'No se pudo rechazar el registro');
            } finally {
              setProcesando(null);
            }
          }
        }
      ]
    );
  };

  const renderRegistro = ({ item }) => (
    <View style={[styles.card, item.rol === 'profesor' ? styles.cardProfesor : styles.cardEstudiante]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <Avatar name={item.nombre} size={52} color={item.rol === 'profesor' ? COLORS.primary : COLORS.secondary} />
        <View style={styles.cardHeaderInfo}>
          <Text style={styles.cardNombre}>{item.nombre}</Text>
          <View style={styles.rolBadge}>
            <Text style={styles.rolBadgeText}>
              {item.rol === 'profesor' ? '👨‍🏫 Profesor' : '🎓 Estudiante'}
            </Text>
          </View>
          <Text style={styles.cardFecha}>
            Solicitado {moment(item.fecha_registro).fromNow()}
          </Text>
        </View>
      </View>

      {/* Datos */}
      <View style={styles.datosGrid}>
        {[
          { icon: '🪪', label: 'Cédula', value: item.cedula },
          { icon: '✉️', label: 'Email', value: item.email },
          { icon: '📱', label: 'Teléfono', value: item.telefono || 'No especificado' },
        ].map(d => (
          <View key={d.label} style={styles.datoRow}>
            <Text style={styles.datoIcon}>{d.icon}</Text>
            <View>
              <Text style={styles.datoLabel}>{d.label}</Text>
              <Text style={styles.datoValue}>{d.value}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Verificación facial */}
      <View style={styles.facialInfo}>
        <Text style={styles.facialIcon}>🔐</Text>
        <View>
          <Text style={styles.facialTitle}>Verificación facial completada</Text>
          <Text style={styles.facialDesc}>El usuario pasó el test de liveness al registrarse</Text>
        </View>
      </View>

      {/* Acciones */}
      {tab === 'pendiente' && (
        <View style={styles.acciones}>
          <TouchableOpacity
            style={[styles.accionBtn, styles.accionBtnDanger]}
            onPress={() => rechazar(item)}
            disabled={procesando === item.id}
          >
            <Text style={styles.accionBtnText}>❌ Rechazar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.accionBtn, styles.accionBtnSuccess]}
            onPress={() => aprobar(item)}
            disabled={procesando === item.id}
          >
            {procesando === item.id
              ? <ActivityIndicator color={COLORS.white} size="small" />
              : <Text style={styles.accionBtnText}>✅ Aprobar</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      {tab === 'aprobado' && (
        <View style={styles.estadoFinalBanner}>
          <Text style={styles.estadoFinalText}>✅ Aprobado — tiene acceso al sistema</Text>
        </View>
      )}

      {tab === 'rechazado' && (
        <View style={[styles.estadoFinalBanner, styles.estadoFinalRechazado]}>
          <Text style={[styles.estadoFinalText, { color: COLORS.danger }]}>❌ Solicitud rechazada</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Solicitudes de acceso</Text>
          {tab === 'pendiente' && pendientes.length > 0 && (
            <Text style={styles.headerBadge}>{pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''}</Text>
          )}
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {[
          { key: 'pendiente', label: '⏳ Pendientes' },
          { key: 'aprobado', label: '✅ Aprobados' },
          { key: 'rechazado', label: '❌ Rechazados' },
        ].map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.loadingText}>Cargando solicitudes...</Text>
        </View>
      ) : pendientes.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>
            {tab === 'pendiente' ? '🎉' : tab === 'aprobado' ? '📋' : '🗑️'}
          </Text>
          <Text style={styles.emptyTitle}>
            {tab === 'pendiente' ? '¡Sin pendientes!' : tab === 'aprobado' ? 'Sin aprobados' : 'Sin rechazados'}
          </Text>
          <Text style={styles.emptyDesc}>
            {tab === 'pendiente' ? 'No hay solicitudes esperando revisión' : `No hay registros ${tab}s aún`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={pendientes}
          keyExtractor={item => item.id.toString()}
          renderItem={renderRegistro}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  header: {
    backgroundColor: COLORS.primary, paddingTop: 52, paddingBottom: 16,
    paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  backBtnText: { fontSize: 20, color: COLORS.white },
  headerTitle: { ...FONTS.h3, color: COLORS.white },
  headerBadge: { ...FONTS.tiny, color: COLORS.warning, textAlign: 'center', marginTop: 2 },

  tabs: {
    flexDirection: 'row', backgroundColor: COLORS.white,
    paddingHorizontal: 16, paddingVertical: 8, gap: 8,
    ...SHADOWS.small,
  },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: RADIUS.md,
    alignItems: 'center', backgroundColor: COLORS.background,
  },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { ...FONTS.tiny, color: COLORS.gray, fontWeight: '600', textAlign: 'center' },
  tabTextActive: { color: COLORS.white },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { ...FONTS.body, color: COLORS.gray },

  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { ...FONTS.h3, color: COLORS.dark, marginBottom: 8 },
  emptyDesc: { ...FONTS.small, color: COLORS.gray, textAlign: 'center' },

  card: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 20,
    marginBottom: 16, ...SHADOWS.medium,
    borderTopWidth: 4,
  },
  cardProfesor: { borderTopColor: COLORS.primary },
  cardEstudiante: { borderTopColor: COLORS.secondary },

  cardHeader: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  cardHeaderInfo: { flex: 1, justifyContent: 'center' },
  cardNombre: { ...FONTS.h4, color: COLORS.dark, marginBottom: 4 },
  rolBadge: {
    backgroundColor: '#EEF2FF', borderRadius: RADIUS.full,
    paddingVertical: 4, paddingHorizontal: 10, alignSelf: 'flex-start', marginBottom: 4,
  },
  rolBadgeText: { ...FONTS.tiny, color: COLORS.primary, fontWeight: '700' },
  cardFecha: { ...FONTS.tiny, color: COLORS.gray },

  datosGrid: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: 14, marginBottom: 14, gap: 10,
  },
  datoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  datoIcon: { fontSize: 16 },
  datoLabel: { ...FONTS.tiny, color: COLORS.gray },
  datoValue: { ...FONTS.small, color: COLORS.dark, fontWeight: '600' },

  facialInfo: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EEF2FF', borderRadius: RADIUS.md, padding: 12, gap: 12, marginBottom: 16,
  },
  facialIcon: { fontSize: 28 },
  facialTitle: { ...FONTS.small, color: COLORS.primary, fontWeight: '700' },
  facialDesc: { ...FONTS.tiny, color: COLORS.gray },

  acciones: { flexDirection: 'row', gap: 10 },
  accionBtn: {
    flex: 1, borderRadius: RADIUS.md,
    paddingVertical: 14, alignItems: 'center', ...SHADOWS.small,
  },
  accionBtnDanger: { backgroundColor: COLORS.dangerLight, borderWidth: 1.5, borderColor: COLORS.danger },
  accionBtnSuccess: { backgroundColor: COLORS.success },
  accionBtnText: { ...FONTS.label, color: COLORS.white },

  estadoFinalBanner: {
    backgroundColor: COLORS.successLight, borderRadius: RADIUS.md, padding: 12, alignItems: 'center',
  },
  estadoFinalRechazado: { backgroundColor: COLORS.dangerLight },
  estadoFinalText: { ...FONTS.small, color: COLORS.success, fontWeight: '700' },
});
