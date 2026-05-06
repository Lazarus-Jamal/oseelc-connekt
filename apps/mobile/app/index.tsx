import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { getStoredUser } from '@/lib/api'

export default function Index() {
  const [checked, setChecked] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    getStoredUser().then((user) => {
      setIsLoggedIn(!!user)
      setChecked(true)
    })
  }, [])

  if (!checked) return null
  return isLoggedIn ? <Redirect href="/(app)/dashboard" /> : <Redirect href="/(auth)/login" />
}
