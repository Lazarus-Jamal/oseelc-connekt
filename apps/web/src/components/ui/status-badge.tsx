import { cn } from '@/lib/utils'
import { DECLARATION_STATUS_LABELS, STAT_STATUS_LABELS } from '@care-connekt/shared'

type StatusType = 'declaration' | 'stat'

const declarationColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  SUBMITTED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  REVIEWED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  VALIDATED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const statColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  SUBMITTED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  VALIDATED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

interface StatusBadgeProps {
  status: string
  type?: StatusType
  className?: string
}

export function StatusBadge({ status, type = 'declaration', className }: StatusBadgeProps) {
  const colors = type === 'declaration' ? declarationColors : statColors
  const labels = type === 'declaration' ? DECLARATION_STATUS_LABELS : STAT_STATUS_LABELS

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', colors[status] || 'bg-gray-100 text-gray-600', className)}>
      {labels[status] || status}
    </span>
  )
}
