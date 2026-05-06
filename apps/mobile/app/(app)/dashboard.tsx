import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { apiClient, logout, getStoredUser } from '@/lib/api'
import { formatCurrency, ROLES_LABELS } from '@care-connekt/shared'

export default function DashboardScreen() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    try {
      const storedUser = await getStoredUser()
      setUser(storedUser)
      const res = await apiClient.get('/dashboard')
      setData(res.data.data)
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les données')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleLogout = async () => {
    await logout()
    router.replace('/(auth)/login')
  }

  const kpis = user?.role === 'FINANCIER' ? [
    { label: 'Recettes ce mois', value: formatCurrency(data?.totalRevenueMTD || 0), color: '#10b981' },
    { label: 'En attente', value: data?.pendingDeclarations || 0, color: '#f59e0b' },
    { label: 'Validées', value: data?.validatedDeclarations || 0, color: '#3b82f6' },
    { label: 'Rejetées', value: data?.rejectedDeclarations || 0, color: '#ef4444' },
  ] : user?.role === 'REGIONAL_DIRECTOR' ? [
    { label: 'Recettes région', value: formatCurrency(data?.totalRegionalRevenue || 0), color: '#10b981' },
    { label: 'Centres', value: data?.facilitiesCount || 0, color: '#3b82f6' },
    { label: 'À réviser', value: data?.pendingReview || 0, color: '#f59e0b' },
    { label: 'Conformité', value: `${data?.complianceRate || 0}%`, color: '#8b5cf6' },
  ] : [
    { label: 'Recettes nationales', value: formatCurrency(data?.totalNationalRevenue || 0), color: '#10b981' },
    { label: 'Formations', value: data?.totalFacilities || 0, color: '#3b82f6' },
    { label: 'À valider', value: data?.pendingValidations || 0, color: '#f59e0b' },
    { label: 'Régions', value: 3, color: '#8b5cf6' },
  ]

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#14b8a6" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour, {user?.name?.split(' ')[0] || '—'}</Text>
          <Text style={styles.role}>{ROLES_LABELS[user?.role] || user?.role || ''}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Déco.</Text>
        </TouchableOpacity>
      </View>

      {/* KPIs */}
      <View style={styles.kpiGrid}>
        {kpis.map((kpi, i) => (
          <View key={i} style={[styles.kpiCard, { borderLeftColor: kpi.color }]}>
            <Text style={styles.kpiValue}>{kpi.value}</Text>
            <Text style={styles.kpiLabel}>{kpi.label}</Text>
          </View>
        ))}
      </View>

      {/* Actions rapides */}
      <Text style={styles.sectionTitle}>Actions rapides</Text>
      <View style={styles.actionsGrid}>
        {[
          { icon: '📋', label: 'Déclarations', route: '/(app)/declarations' },
          { icon: '📊', label: 'Statistiques', route: '/(app)/statistics' },
          { icon: '📄', label: 'Rapports', route: '/(app)/reports' },
          { icon: '🔔', label: 'Notifications', route: '/(app)/notifications' },
        ].map((action) => (
          <TouchableOpacity
            key={action.route}
            style={styles.actionCard}
            onPress={() => router.push(action.route as any)}
          >
            <Text style={styles.actionIcon}>{action.icon}</Text>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#0f766e', padding: 20, paddingTop: 56, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  role: { fontSize: 13, color: '#99f6e0', marginTop: 2 },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  logoutText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  kpiCard: { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 12, padding: 16, borderLeftWidth: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  kpiValue: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  kpiLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#374151', paddingHorizontal: 16, paddingVertical: 8 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  actionCard: { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  actionIcon: { fontSize: 28, marginBottom: 8 },
  actionLabel: { fontSize: 13, fontWeight: '500', color: '#374151' },
})
