import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Image, TextInput,
} from 'react-native';
import { adminService } from '../../services/services';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../../utils/theme';
import { Avatar, StatusBadge } from '../../components/UIComponents';
import Toast from 'react-native-toast-message';
import moment from 'moment';

// ══════════════════════════════════════════
// PROFESORES
// ══════════════════════════════════════════
export function AdminProfesoresScreen({ navigation }) {
  const [profesores, setProfesores] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    adminService.getProfesores().then(r => { setProfesores(r.data); setFiltered(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(profesores.filter(p => p.nombre.toLowerCase().includes(q) || p.departamento_nombre?.toLowerCase().includes(q)));
  }, [search, profesores]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}><Text style={styles.backCircleText}>←</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Profesores</Text>
        <View style={{ width: 36 }} />
      </View>
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput style={styles.searchInput} placeholder="Buscar profesor..." placeholderTextColor={COLORS.gray} value={search} onChangeText={setSearch} />
      </View>
      {loading ? <ActivityIndicator color={COLORS.primary} style={{ flex: 1 }} /> : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.profCard, item.en_alerta && styles.profCardAlerta]} onPress={() => navigation.navigate('ProfesorDetalle', { profesorId: item.id })}>
              <Avatar name={item.nombre} size={50} color={item.en_alerta ? COLORS.danger : COLORS.primary} />
              <View style={styles.profInfo}>
                <View style={styles.profNameRow}>
                  <Text style={styles.profNombre}>{item.nombre}</Text>
                  {item.en_alerta && <View style={styles.alertaTag}><Text style={styles.alertaTagText}>🚨 ALERTA</Text></View>}
                </View>
                <Text style={styles.profDept}>{item.departamento_nombre}</Text>
                <View style={styles.profStats}>
                  <Text style={[styles.profStat, { color: COLORS.success }]}>✅ {item.presentes}</Text>
                  <Text style={[styles.profStat, { color: COLORS.warning }]}>⏰ {item.tardios}</Text>
                  <Text style={[styles.profStat, { color: COLORS.danger }]}>❌ {item.inasistencias}</Text>
                </View>
              </View>
              <Text style={{ color: COLORS.gray, fontSize: 18 }}>›</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </View>
  );
}

// ══════════════════════════════════════════
// RANKING
// ══════════════════════════════════════════
export function AdminRankingScreen({ navigation }) {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [corte, setCorte] = useState(0);

  useEffect(() => { load(); }, [corte]);
  const load = async () => {
    setLoading(true);
    try { const r = await adminService.getRanking('actual', corte || null); setRanking(r.data); } catch {} finally { setLoading(false); }
  };

  const medalIcon = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}><Text style={styles.backCircleText}>←</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Ranking Inasistencias</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtros}>
        {[{ l: 'Semestre', v: 0 }, { l: 'Corte 1', v: 1 }, { l: 'Corte 2', v: 2 }, { l: 'Corte 3', v: 3 }].map(f => (
          <TouchableOpacity key={f.v} style={[styles.filtroBtn, corte === f.v && styles.filtroBtnOn]} onPress={() => setCorte(f.v)}>
            <Text style={[styles.filtroText, corte === f.v && styles.filtroTextOn]}>{f.l}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {loading ? <ActivityIndicator color={COLORS.primary} style={{ flex: 1 }} /> : (
        <FlatList
          data={ranking}
          keyExtractor={i => i.id.toString()}
          renderItem={({ item, index }) => (
            <TouchableOpacity style={[styles.rankCard, index === 0 && styles.rankFirst]} onPress={() => navigation.navigate('ProfesorDetalle', { profesorId: item.id })}>
              <Text style={styles.medal}>{medalIcon(index)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rankNombre}>{item.profesor_nombre}</Text>
                <Text style={styles.rankDept}>{item.departamento_nombre}</Text>
              </View>
              <View style={styles.rankStats}>
                <Text style={[styles.rankFaltas, { color: COLORS.danger }]}>❌ {item.total_inasistencias}</Text>
                <Text style={[styles.rankFaltas, { color: COLORS.warning }]}>⏰ {item.total_tardios}</Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </View>
  );
}

// ══════════════════════════════════════════
// ALERTAS
// ══════════════════════════════════════════
export function AdminAlertasScreen({ navigation }) {
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getProfesoresEnAlerta().then(r => { setAlertas(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { backgroundColor: COLORS.danger }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}><Text style={styles.backCircleText}>←</Text></TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>🚨 Profesores en alerta</Text>
          <Text style={styles.headerSub}>Superaron el umbral de inasistencias</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>
      {loading ? <ActivityIndicator color={COLORS.primary} style={{ flex: 1 }} /> : alertas.length === 0 ? (
        <View style={styles.emptyFull}>
          <Text style={{ fontSize: 60, marginBottom: 16 }}>✅</Text>
          <Text style={styles.emptyTitle}>¡Sin alertas activas!</Text>
          <Text style={styles.emptyDesc}>Todos los profesores están dentro del umbral</Text>
        </View>
      ) : (
        <FlatList
          data={alertas}
          keyExtractor={i => i.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.alertaProf} onPress={() => navigation.navigate('ProfesorDetalle', { profesorId: item.id })}>
              <Avatar name={item.nombre} size={54} color={COLORS.danger} />
              <View style={styles.alertaProfInfo}>
                <Text style={styles.alertaProfNombre}>{item.nombre}</Text>
                <Text style={styles.alertaProfDept}>{item.departamento_nombre}</Text>
                <Text style={styles.alertaProfEmail}>✉️ {item.email}</Text>
                <Text style={styles.alertaProfTel}>📱 {item.telefono}</Text>
                <View style={styles.alertaProfStats}>
                  <View style={styles.alertaProfBadge}><Text style={styles.alertaProfBadgeText}>❌ {item.total_inasistencias} faltas</Text></View>
                  <View style={[styles.alertaProfBadge, { backgroundColor: COLORS.warningLight }]}><Text style={[styles.alertaProfBadgeText, { color: COLORS.warning }]}>⏰ {item.total_tardios} tardíos</Text></View>
                </View>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </View>
  );
}

// ══════════════════════════════════════════
// ESTADÍSTICAS
// ══════════════════════════════════════════
export function AdminEstadisticasScreen({ navigation }) {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [corte, setCorte] = useState(0);
  const [exportando, setExportando] = useState(false);

  useEffect(() => { load(); }, [corte]);
  const load = async () => {
    setLoading(true);
    try { const r = await adminService.getEstadisticasCarrera('actual', corte || null); setStats(r.data); } catch {} finally { setLoading(false); }
  };

  const exportar = async (tipo) => {
    setExportando(true);
    try {
      await adminService.exportarReporte(tipo, { corte_id: corte || null });
      Toast.show({ type: 'success', text1: `📄 Reporte ${tipo} generado` });
    } catch { Alert.alert('Error', 'No se pudo generar el reporte'); } finally { setExportando(false); }
  };

  const getPct = (pct) => {
    if (pct >= 80) return COLORS.success;
    if (pct >= 60) return COLORS.warning;
    return COLORS.danger;
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}><Text style={styles.backCircleText}>←</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Estadísticas por carrera</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtros}>
        {[{ l: 'Semestre', v: 0 }, { l: 'Corte 1', v: 1 }, { l: 'Corte 2', v: 2 }, { l: 'Corte 3', v: 3 }].map(f => (
          <TouchableOpacity key={f.v} style={[styles.filtroBtn, corte === f.v && styles.filtroBtnOn]} onPress={() => setCorte(f.v)}>
            <Text style={[styles.filtroText, corte === f.v && styles.filtroTextOn]}>{f.l}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.exportRow}>
        <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#E53935' }]} onPress={() => exportar('PDF')} disabled={exportando}>
          <Text style={styles.exportBtnText}>{exportando ? '...' : '📄 PDF'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#2E7D32' }]} onPress={() => exportar('Excel')} disabled={exportando}>
          <Text style={styles.exportBtnText}>{exportando ? '...' : '📊 Excel'}</Text>
        </TouchableOpacity>
      </View>
      {loading ? <ActivityIndicator color={COLORS.primary} style={{ flex: 1 }} /> : (
        <FlatList
          data={stats}
          keyExtractor={i => i.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.carreraCard}>
              <Text style={styles.carreraNombre}>{item.carrera_nombre}</Text>
              <Text style={styles.carreraDept}>{item.departamento_nombre}</Text>
              <View style={styles.carreraStats}>
                <View style={styles.carreraStat}><Text style={styles.carreraStatNum}>{item.total_clases_programadas}</Text><Text style={styles.carreraStatLabel}>Programadas</Text></View>
                <View style={styles.carreraStat}><Text style={[styles.carreraStatNum, { color: COLORS.danger }]}>{item.total_inasistencias}</Text><Text style={styles.carreraStatLabel}>Inasistencias</Text></View>
                <View style={styles.carreraStat}><Text style={[styles.carreraStatNum, { color: getPct(item.porcentaje_cumplimiento) }]}>{item.porcentaje_cumplimiento}%</Text><Text style={styles.carreraStatLabel}>Cumplimiento</Text></View>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${item.porcentaje_cumplimiento}%`, backgroundColor: getPct(item.porcentaje_cumplimiento) }]} />
              </View>
            </View>
          )}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </View>
  );
}

// ══════════════════════════════════════════
// DETALLE PROFESOR
// ══════════════════════════════════════════
export function AdminProfesorDetalleScreen({ route, navigation }) {
  const { profesorId } = route.params;
  const [profesor, setProfesor] = useState(null);
  const [histDisc, setHistDisc] = useState([]);
  const [loading, setLoading] = useState(true);
  const [corte, setCorte] = useState(0);

  useEffect(() => { load(); }, []);
  const load = async () => {
    try {
      const [profRes, discRes] = await Promise.all([adminService.getProfesores(), adminService.getHistorialDisciplinario(profesorId)]);
      setProfesor(profRes.data.find(p => p.id === profesorId));
      setHistDisc(discRes.data);
    } catch {} finally { setLoading(false); }
  };

  const justificar = (asistenciaId) => {
    Alert.prompt('Justificar inasistencia', 'Describe la justificación:', async (text) => {
      if (!text?.trim()) return;
      try {
        await adminService.justificarInasistencia(asistenciaId, text);
        Toast.show({ type: 'success', text1: '✅ Inasistencia justificada' });
      } catch { Alert.alert('Error', 'No se pudo justificar'); }
    });
  };

  const registrarAccion = () => {
    Alert.prompt('Acción disciplinaria', 'Describe la acción tomada:', async (text) => {
      if (!text?.trim()) return;
      try {
        await adminService.registrarAccionDisciplinaria(profesorId, { descripcion: `Reunión disciplinaria`, accion_tomada: text });
        Toast.show({ type: 'success', text1: '✅ Acción registrada' });
        load();
      } catch { Alert.alert('Error', 'No se pudo registrar'); }
    });
  };

  if (loading) return <ActivityIndicator color={COLORS.primary} style={{ flex: 1, marginTop: 100 }} />;

  const getStatByCorte = (field) => {
    if (corte === 0) return profesor?.[field] || 0;
    return profesor?.[`corte${corte}_${field}`] || 0;
  };

  return (
    <ScrollView style={styles.root}>
      {/* Header */}
      <View style={styles.detalleHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}><Text style={styles.backCircleText}>←</Text></TouchableOpacity>
        <View style={styles.detalleAvatar}>
          <Text style={styles.detalleAvatarText}>{profesor?.nombre?.charAt(0)}</Text>
        </View>
        <Text style={styles.detalleNombre}>{profesor?.nombre}</Text>
        <Text style={styles.detalleDept}>{profesor?.departamento_nombre}</Text>
        <View style={styles.detalleContacto}>
          <Text style={styles.detalleContactoText}>📱 {profesor?.telefono}</Text>
          <Text style={styles.detalleContactoText}>✉️ {profesor?.email}</Text>
          <Text style={styles.detalleContactoText}>🪪 {profesor?.cedula}</Text>
        </View>
      </View>

      {/* Filtro cortes */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtros}>
        {[{ l: 'Total', v: 0 }, { l: 'Corte 1', v: 1 }, { l: 'Corte 2', v: 2 }, { l: 'Corte 3', v: 3 }].map(f => (
          <TouchableOpacity key={f.v} style={[styles.filtroBtn, corte === f.v && styles.filtroBtnOn]} onPress={() => setCorte(f.v)}>
            <Text style={[styles.filtroText, corte === f.v && styles.filtroTextOn]}>{f.l}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Stats */}
      <View style={styles.detalleStats}>
        {[
          { label: 'Presentes', val: profesor?.presentes || 0, color: COLORS.success },
          { label: 'Tardíos', val: profesor?.tardios || 0, color: COLORS.warning },
          { label: 'Faltas', val: profesor?.inasistencias || 0, color: COLORS.danger },
          { label: 'Justif.', val: profesor?.justificadas || 0, color: COLORS.secondary },
        ].map(s => (
          <View key={s.label} style={[styles.detalleStat, { borderTopColor: s.color }]}>
            <Text style={[styles.detalleStatNum, { color: s.color }]}>{s.val}</Text>
            <Text style={styles.detalleStatLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Acción disciplinaria */}
      {profesor?.en_alerta && (
        <View style={styles.alertaSection}>
          <Text style={styles.alertaSectionTitle}>🚨 Este profesor está en alerta</Text>
          <TouchableOpacity style={styles.accionBtn} onPress={registrarAccion}>
            <Text style={styles.accionBtnText}>📋 Registrar acción disciplinaria</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Historial disciplinario */}
      {histDisc.length > 0 && (
        <View style={styles.discSection}>
          <Text style={styles.discTitle}>Historial disciplinario</Text>
          {histDisc.map(h => (
            <View key={h.id} style={styles.discCard}>
              <Text style={styles.discFecha}>{moment(h.fecha).format('D MMM YYYY')}</Text>
              <Text style={styles.discDesc}>{h.descripcion}</Text>
              <Text style={styles.discAccion}>Acción: {h.accion_tomada}</Text>
              {h.seguimiento && <Text style={styles.discSeg}>Seguimiento: {h.seguimiento}</Text>}
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary, paddingTop: 52, paddingBottom: 16,
    paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerTitle: { ...FONTS.h3, color: COLORS.white },
  headerSub: { ...FONTS.tiny, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  backCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  backCircleText: { fontSize: 20, color: COLORS.white },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, margin: 16, borderRadius: RADIUS.md, paddingHorizontal: 14, ...SHADOWS.small },
  searchIcon: { fontSize: 18, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, ...FONTS.body, color: COLORS.dark },
  profCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12, ...SHADOWS.small },
  profCardAlerta: { borderLeftWidth: 4, borderLeftColor: COLORS.danger },
  profInfo: { flex: 1 },
  profNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  profNombre: { ...FONTS.body, color: COLORS.dark, fontWeight: '700' },
  alertaTag: { backgroundColor: COLORS.dangerLight, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  alertaTagText: { ...FONTS.tiny, color: COLORS.danger, fontWeight: '700' },
  profDept: { ...FONTS.small, color: COLORS.secondary, marginTop: 2 },
  profStats: { flexDirection: 'row', gap: 12, marginTop: 6 },
  profStat: { ...FONTS.small, fontWeight: '700' },
  filtros: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row' },
  filtroBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: COLORS.white, marginRight: 8, ...SHADOWS.small },
  filtroBtnOn: { backgroundColor: COLORS.primary },
  filtroText: { ...FONTS.small, color: COLORS.gray, fontWeight: '600' },
  filtroTextOn: { color: COLORS.white },
  rankCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12, ...SHADOWS.small },
  rankFirst: { borderWidth: 2, borderColor: '#FFD700' },
  medal: { fontSize: 28, width: 40, textAlign: 'center' },
  rankNombre: { ...FONTS.body, color: COLORS.dark, fontWeight: '700' },
  rankDept: { ...FONTS.small, color: COLORS.gray },
  rankStats: { alignItems: 'flex-end', gap: 4 },
  rankFaltas: { ...FONTS.small, fontWeight: '700' },
  emptyFull: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { ...FONTS.h3, color: COLORS.dark, marginBottom: 8 },
  emptyDesc: { ...FONTS.small, color: COLORS.gray, textAlign: 'center' },
  alertaProf: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 16, marginBottom: 12, flexDirection: 'row', gap: 14, borderLeftWidth: 4, borderLeftColor: COLORS.danger, ...SHADOWS.small },
  alertaProfInfo: { flex: 1 },
  alertaProfNombre: { ...FONTS.h4, color: COLORS.dark },
  alertaProfDept: { ...FONTS.small, color: COLORS.secondary, marginBottom: 4 },
  alertaProfEmail: { ...FONTS.tiny, color: COLORS.gray },
  alertaProfTel: { ...FONTS.tiny, color: COLORS.gray, marginBottom: 8 },
  alertaProfStats: { flexDirection: 'row', gap: 8 },
  alertaProfBadge: { backgroundColor: COLORS.dangerLight, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  alertaProfBadgeText: { ...FONTS.tiny, color: COLORS.danger, fontWeight: '700' },
  exportRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 4 },
  exportBtn: { flex: 1, borderRadius: RADIUS.md, padding: 12, alignItems: 'center' },
  exportBtnText: { ...FONTS.label, color: COLORS.white },
  carreraCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 18, marginBottom: 12, ...SHADOWS.small },
  carreraNombre: { ...FONTS.h4, color: COLORS.dark },
  carreraDept: { ...FONTS.small, color: COLORS.secondary, marginBottom: 12 },
  carreraStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  carreraStat: { alignItems: 'center' },
  carreraStatNum: { ...FONTS.h3, color: COLORS.dark },
  carreraStatLabel: { ...FONTS.tiny, color: COLORS.gray },
  progressTrack: { height: 8, backgroundColor: COLORS.grayLight, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  detalleHeader: { backgroundColor: COLORS.primary, paddingTop: 52, paddingBottom: 30, paddingHorizontal: 20, alignItems: 'center' },
  detalleAvatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginTop: 16, marginBottom: 12, borderWidth: 3, borderColor: COLORS.white },
  detalleAvatarText: { fontSize: 36, fontWeight: '800', color: COLORS.white },
  detalleNombre: { ...FONTS.h2, color: COLORS.white, textAlign: 'center' },
  detalleDept: { ...FONTS.body, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  detalleContacto: { marginTop: 12, gap: 4 },
  detalleContactoText: { ...FONTS.small, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  detalleStats: { flexDirection: 'row', gap: 10, padding: 16 },
  detalleStat: { flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: 14, alignItems: 'center', borderTopWidth: 4, ...SHADOWS.small },
  detalleStatNum: { ...FONTS.h2 },
  detalleStatLabel: { ...FONTS.tiny, color: COLORS.gray, marginTop: 2 },
  alertaSection: { marginHorizontal: 16, marginBottom: 16, backgroundColor: COLORS.dangerLight, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.danger },
  alertaSectionTitle: { ...FONTS.h4, color: COLORS.danger, marginBottom: 12 },
  accionBtn: { backgroundColor: COLORS.danger, borderRadius: RADIUS.md, padding: 14, alignItems: 'center' },
  accionBtnText: { ...FONTS.label, color: COLORS.white },
  discSection: { marginHorizontal: 16, marginBottom: 16 },
  discTitle: { ...FONTS.h4, color: COLORS.dark, marginBottom: 12 },
  discCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: 14, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: COLORS.danger, ...SHADOWS.small },
  discFecha: { ...FONTS.tiny, color: COLORS.gray },
  discDesc: { ...FONTS.body, color: COLORS.dark, fontWeight: '600', marginTop: 4 },
  discAccion: { ...FONTS.small, color: COLORS.secondary, marginTop: 4 },
  discSeg: { ...FONTS.tiny, color: COLORS.gray, marginTop: 2 },
});
