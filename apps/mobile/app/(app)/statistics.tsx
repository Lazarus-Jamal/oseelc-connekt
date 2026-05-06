import { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { apiClient } from '@/lib/api'
import { getMonthLabel, formatPercentage, STAT_STATUS_LABELS } from '@care-connekt/shared'

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6b7280',
  SUBMITTED: '#3b82f6',
  VALIDATED: '#10b981',
  REJECTED: '#ef4444',
}

export default function StatisticsScreen() {
  const router = useRouter()
  const [sheets, setSheets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    try {
      const res = await apiClient.get('/statistics')
      setSheets(res.data.data || [])
    } catch {}
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#14b8a6" /></View>
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Statistiques sanitaires</Text>
      </View>

      <FlatList
        data={sheets}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#14b8a6" />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>Aucune fiche statistique</Text></View>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/(app)/stat-detail?id=${item.id}` as any)}>
            <View style={styles.cardHeader}>
              <Text style={styles.ref}>{item.reference}</Text>
              <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] + '20' }]}>
                <Text style={[styles.badgeText, { color: STATUS_COLORS[item.status] }]}>
                  {STAT_STATUS_LABELS[item.status] || item.status}
                </Text>
              </View>
            </View>
            <Text style={styles.facility}>{item.facility?.name}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.period}>{getMonthLabel(item.month, item.year)}</Text>
              {item.completeness !== null && (
                <View style={styles.completeness}>
                  <View style={[styles.bar, { width: `${item.completeness}%` as any, backgroundColor: item.completeness >= 80 ? '#10b981' : item.completeness >= 50 ? '#f59e0b' : '#ef4444' }]} />
                  <Text style={styles.completenessText}>{formatPercentage(item.completeness)}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#0f766e', padding: 20, paddingTop: 56 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  list: { padding: 16, gap: 10 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  ref: { fontSize: 13, fontFamily: 'monospace', fontWeight: '600', color: '#111827' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  facility: { fontSize: 13, color: '#6b7280', marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  period: { fontSize: 13, color: '#374151', fontWeight: '500' },
  completeness: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bar: { height: 4, borderRadius: 2, minWidth: 4 },
  completenessText: { fontSize: 11, color: '#6b7280' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#9ca3af', fontSize: 14 },
})
