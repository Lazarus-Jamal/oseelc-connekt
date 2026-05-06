import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native'
import { apiClient } from '@/lib/api'
import { formatCurrency } from '@care-connekt/shared'

export default function ReportsScreen() {
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    try {
      const res = await apiClient.get('/reports/financial')
      setReport(res.data.data)
    } catch {}
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [])

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#14b8a6" /></View>

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#14b8a6" />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Rapports financiers</Text>
        <Text style={styles.subtitle}>Données validées uniquement</Text>
      </View>

      {/* Résumé */}
      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{formatCurrency(report?.summary?.totalRevenue || 0)}</Text>
          <Text style={styles.summaryLabel}>Recettes totales</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{report?.summary?.declarationsCount || 0}</Text>
          <Text style={styles.summaryLabel}>Déclarations</Text>
        </View>
      </View>

      {/* Par catégorie */}
      {(report?.byCategory || []).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Par catégorie de recette</Text>
          {report.byCategory.map((item: any) => (
            <View key={item.category} style={styles.row}>
              <Text style={styles.rowLabel}>{item.category}</Text>
              <Text style={styles.rowValue}>{formatCurrency(item.total)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Par formation sanitaire */}
      {(report?.byFacility || []).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Par formation sanitaire</Text>
          {report.byFacility.map((item: any) => (
            <View key={item.facilityId} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{item.name}</Text>
                <Text style={styles.rowSub}>{item.count} déclaration{item.count > 1 ? 's' : ''}</Text>
              </View>
              <Text style={styles.rowValue}>{formatCurrency(item.total)}</Text>
            </View>
          ))}
        </View>
      )}

      {!report && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Aucune donnée disponible</Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#0f766e', padding: 20, paddingTop: 56 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 12, color: '#99f6e0', marginTop: 2 },
  summaryGrid: { flexDirection: 'row', gap: 12, padding: 16 },
  summaryCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  summaryValue: { fontSize: 18, fontWeight: 'bold', color: '#111827', textAlign: 'center' },
  summaryLabel: { fontSize: 12, color: '#6b7280', marginTop: 4, textAlign: 'center' },
  section: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 16, borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#374151', padding: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  rowLabel: { fontSize: 13, color: '#374151', flex: 1 },
  rowSub: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  rowValue: { fontSize: 13, fontWeight: '600', color: '#111827', marginLeft: 8 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#9ca3af', fontSize: 14 },
})
