export function formatCurrency(amount: number | string, _currency = 'XAF'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount)
  if (isNaN(num)) return '—'
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num) + ' F CFA'
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(value)
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

export function generateReference(prefix: string, count: number): string {
  const year = new Date().getFullYear()
  const seq = String(count).padStart(4, '0')
  return `${prefix}-${year}-${seq}`
}

export function truncate(str: string, max = 50): string {
  if (str.length <= max) return str
  return str.slice(0, max - 3) + '...'
}
