import { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native'
import { apiClient } from '@/lib/api'
import { formatDateTime } from '@care-connekt/shared'

const TYPE_COLORS: Record<string, string> = {
  DECLARATION_VALIDATED: '#10b981',
  STAT_VALIDATED: '#10b981',
  DECLARATION_REJECTED: '#ef4444',
  DECLARATION_SUBMITTED: '#3b82f6',
  STAT_SUBMITTED: '#3b82f6',
  DEADLINE_APPROACHING: '#f59e0b',
  DEADLINE_MISSED: '#ef4444',
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [unread, setUnread] = useState(0)

  const load = async () => {
    try {
      const res = await apiClient.get('/notifications')
      setNotifications(res.data.data || [])
      setUnread(res.data.unreadCount || 0)
    } catch {}
    setLoading(false)
    setRefreshing(false)
  }

  const markAllRead = async () => {
    await apiClient.patch('/notifications', { markAllRead: true })
    load()
  }

  useEffect(() => { load() }, [])

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#14b8a6" /></View>

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notifications</Text>
          {unread > 0 && <Text style={styles.subtitle}>{unread} non lue{unread > 1 ? 's' : ''}</Text>}
        </View>
        {unread > 0 && (
          <TouchableOpacity onPress={markAllRead} style={styles.markBtn}>
            <Text style={styles.markBtnText}>Tout lire</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#14b8a6" />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>Aucune notification</Text></View>}
        renderItem={({ item }) => (
          <View style={[styles.card, !item.isRead && styles.cardUnread]}>
            <View style={[styles.dot, { backgroundColor: TYPE_COLORS[item.type] || '#6b7280' }]} />
            <View style={styles.content}>
              <Text style={[styles.nTitle, !item.isRead && styles.nTitleBold]}>{item.title}</Text>
              <Text style={styles.nMessage}>{item.message}</Text>
              <Text style={styles.nDate}>{formatDateTime(item.createdAt)}</Text>
            </View>
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#0f766e', padding: 20, paddingTop: 56, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 12, color: '#99f6e0', marginTop: 2 },
  markBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  markBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  list: { padding: 16, gap: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, flexDirection: 'row', gap: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  cardUnread: { backgroundColor: '#f0fdf9', borderWidth: 1, borderColor: '#ccfbef' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0 },
  content: { flex: 1 },
  nTitle: { fontSize: 14, color: '#374151' },
  nTitleBold: { fontWeight: '600', color: '#111827' },
  nMessage: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  nDate: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#9ca3af', fontSize: 14 },
})
