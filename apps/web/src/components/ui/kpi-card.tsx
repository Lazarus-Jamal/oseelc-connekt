import { cn } from '@/lib/utils'
import { TrendingDown, TrendingUp } from 'lucide-react'
import type { KpiCard } from '@care-connekt/shared'

interface KpiCardProps extends KpiCard {
  className?: string
  icon?: React.ElementType
}

const colorMap = {
  green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
  blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
}

export function KpiCardComponent({ label, value, unit, trend, trendLabel, color = 'blue', icon: Icon, className }: KpiCardProps) {
  const isPositiveTrend = trend !== undefined && trend >= 0

  return (
    <div className={cn('bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</p>
          <div className="mt-1 flex items-baseline gap-1">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            {unit && <p className="text-sm text-gray-500 dark:text-gray-400">{unit}</p>}
          </div>
          {trend !== undefined && (
            <div className={cn('mt-2 flex items-center gap-1 text-xs font-medium', isPositiveTrend ? 'text-green-600' : 'text-red-600')}>
              {isPositiveTrend ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{Math.abs(trend)}%</span>
              {trendLabel && <span className="text-gray-400 font-normal">{trendLabel}</span>}
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', colorMap[color])}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  )
}
