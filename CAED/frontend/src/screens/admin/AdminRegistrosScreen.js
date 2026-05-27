import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, Image, Modal, ScrollView,
} from 'react-native';
import { adminService } from '../../services/services';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../../utils/theme';
import { StatusBadge } from '../../components/UIComponents';
import Toast from 'react-native-toast-message';
import moment from 'moment';

// Componente foto con fallback a iniciales
function FotoUsuario({ foto, nombre, size = 64, color = COLORS.primary }) {
  const [error, setError] = useState(false);
  const initials = nombre?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

  if (foto && !error) {
    return (
      <Image
        source={{ uri: `data:image/jpeg;base64,${foto}` }}
        style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: color }}
        onError={() => setError(true)}
      />
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.35 }}>{initials}</Text>
    </View>
  );
}

export default function AdminRegistrosScreen({ navigation }) {
  const [pendientes, setPendientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(null);
  const [tab, setTab] = useState('pendiente');
  const [fotoModal, setFotoModal] = useState(null); // foto en grande

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
      {/* Header con foto real */}
      <View style={styles.cardHeader}>
        <TouchableOpacity onPress={() => item.foto && setFotoModal(item.foto)} activeOpacity={item.foto ? 0.7 : 1}>
          <FotoUsuario
            foto={item.foto}
            nombre={item.nombre}
            size={64}
            color={item.rol === 'profesor' ? COLORS.primary : COLORS.secondary}
          />
          {item.foto && (
            <View style={styles.fotoZoomBadge}>
              <Text style={{ fontSize: 10 }}>🔍</Text>
            </View>
          )}
        </TouchableOpacity>
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
        <View style={{ flex: 1 }}>
          <Text style={styles.facialTitle}>Verificación facial completada</Text>
          <Text style={styles.facialDesc}>
            {item.foto ? 'Toca la foto para verla en grande' : 'El usuario pasó el test de liveness al registrarse'}
          </Text>
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

      {/* Modal para ver foto en grande */}
      <Modal visible={!!fotoModal} transparent animationType="fade" onRequestClose={() => setFotoModal(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFotoModal(null)}>
          <View style={styles.modalBox}>
            <Image
              source={{ uri: `data:image/jpeg;base64,${fotoModal}` }}
              style={styles.modalFoto}
              resizeMode="cover"
            />
            <Text style={styles.modalHint}>Toca fuera para cerrar</Text>
          </View>
        </TouchableOpacity>
      </Modal>
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
    marginBottom: 16, ...SHADOWS.medium, borderTopWidth: 4,
  },
  cardProfesor: { borderTopColor: COLORS.primary },
  cardEstudiante: { borderTopColor: COLORS.secondary },
  cardHeader: { flexDirection: 'row', gap: 14, marginBottom: 16, alignItems: 'center' },
  cardHeaderInfo: { flex: 1, justifyContent: 'center' },
  cardNombre: { ...FONTS.h4, color: COLORS.dark, marginBottom: 4 },
  rolBadge: {
    backgroundColor: '#EEF2FF', borderRadius: RADIUS.full,
    paddingVertical: 4, paddingHorizontal: 10, alignSelf: 'flex-start', marginBottom: 4,
  },
  rolBadgeText: { ...FONTS.tiny, color: COLORS.primary, fontWeight: '700' },
  cardFecha: { ...FONTS.tiny, color: COLORS.gray },
  fotoZoomBadge: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: COLORS.white, borderRadius: 10, width: 20, height: 20,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.grayLight,
  },
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
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalBox: { alignItems: 'center', gap: 16 },
  modalFoto: {
    width: 280, height: 280, borderRadius: 140,
    borderWidth: 4, borderColor: COLORS.white,
  },
  modalHint: { ...FONTS.small, color: 'rgba(255,255,255,0.6)' },
});
    
