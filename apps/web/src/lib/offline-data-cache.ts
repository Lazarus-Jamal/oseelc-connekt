const KEY_FACILITIES   = 'oseelc:offline:facilities'
const KEY_USER_INFO    = 'oseelc:offline:user'

export function cacheReferenceData(facilities: any[], user: { facilityId?: string | null; name?: string }) {
  try {
    localStorage.setItem(KEY_FACILITIES, JSON.stringify(facilities))
    localStorage.setItem(KEY_USER_INFO,  JSON.stringify(user))
  } catch {}
}

export function getCachedFacilities(): { id: string; name: string; type: string }[] {
  try { return JSON.parse(localStorage.getItem(KEY_FACILITIES) || '[]') } catch { return [] }
}

export function getCachedUser(): { facilityId?: string; name?: string } {
  try { return JSON.parse(localStorage.getItem(KEY_USER_INFO) || '{}') } catch { return {} }
}
