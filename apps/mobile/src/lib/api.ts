import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api'

export const apiClient = axios.create({ baseURL: BASE_URL })

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('auth_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export async function login(email: string, password: string) {
  const res = await apiClient.post('/auth/mobile', { email, password })
  if (res.data.success) {
    await SecureStore.setItemAsync('auth_token', res.data.token)
    await SecureStore.setItemAsync('auth_user', JSON.stringify(res.data.user))
  }
  return res.data
}

export async function logout() {
  await SecureStore.deleteItemAsync('auth_token')
  await SecureStore.deleteItemAsync('auth_user')
}

export async function getStoredUser() {
  const raw = await SecureStore.getItemAsync('auth_user')
  return raw ? JSON.parse(raw) : null
}
