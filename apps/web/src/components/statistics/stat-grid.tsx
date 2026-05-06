'use client'

// ── Shared grid types and components ──────────────────────────────────────────

export interface Indicator {
  id: string
  code: string
  label: string
  category: string
  unit: string | null
  isRequired: boolean
  description: string | null
}

export const AGE_CODES = ['M5', '5_14', '15_24', '25_49', '50P'] as const
export const AGE_LABELS: Record<string, string> = {
  M5:      '< 5 ans',
  '5_14':  '5-14 ans',
  '15_24': '15-24 ans',
  '25_49': '25-49 ans',
  '50P':   '50+ ans',
}
export const SEX_LABELS: Record<string, string> = { M: 'Masculin', F: 'Féminin' }
export const AGESEX_COLS = AGE_CODES.flatMap((a) => [`${a}_M`, `${a}_F`])
export const AGESEX_RE   = /_(M5|5_14|15_24|25_49|50P)_(M|F)$/
export const AGE_ONLY_RE = /_(M5|5_14|15_24|25_49|50P)$/
export const SEX_RE      = /_(M|F)$/

export type GridType = 'agesex' | 'age' | 'sex' | 'flat'

export interface GridInfo {
  type: GridType
  cols: string[]
  colLabels: Record<string, string>
  rows: { prefix: string; label: string }[]
  get: (prefix: string, col: string) => Indicator | undefined
}

export function detectGrid(indicators: Indicator[]): GridInfo {
  const hasAgeSex = indicators.some((i) => AGESEX_RE.test(i.code))
  const hasAge    = !hasAgeSex && indicators.some((i) => AGE_ONLY_RE.test(i.code))
  const hasSex    = !hasAgeSex && !hasAge && indicators.some((i) => SEX_RE.test(i.code))

  if (hasAgeSex) {
    const prefixes = [...new Set(
      indicators.filter((i) => AGESEX_RE.test(i.code)).map((i) => i.code.replace(AGESEX_RE, ''))
    )]
    const rows = prefixes.map((prefix) => {
      const sample = indicators.find((i) => AGESEX_RE.test(i.code) && i.code.startsWith(prefix + '_'))
      return { prefix, label: sample ? sample.label.split(' · ')[0] : prefix }
    })
    return {
      type: 'agesex',
      cols: AGESEX_COLS,
      colLabels: Object.fromEntries(AGESEX_COLS.map((c) => [c, c.endsWith('_M') ? 'M' : 'F'])),
      rows,
      get: (prefix, col) => indicators.find((i) => i.code === `${prefix}_${col}`),
    }
  }

  if (hasAge) {
    const prefixes = [...new Set(
      indicators.filter((i) => AGE_ONLY_RE.test(i.code)).map((i) => i.code.replace(AGE_ONLY_RE, ''))
    )]
    const rows = prefixes.map((prefix) => {
      const sample = indicators.find((i) => AGE_ONLY_RE.test(i.code) && i.code.startsWith(prefix + '_'))
      return { prefix, label: sample ? sample.label.split(' · ')[0] : prefix }
    })
    return {
      type: 'age',
      cols: [...AGE_CODES],
      colLabels: AGE_LABELS,
      rows,
      get: (prefix, col) => indicators.find((i) => i.code === `${prefix}_${col}`),
    }
  }

  if (hasSex) {
    const prefixes = [...new Set(
      indicators.filter((i) => SEX_RE.test(i.code)).map((i) => i.code.replace(SEX_RE, ''))
    )]
    const rows = prefixes.map((prefix) => {
      const sample = indicators.find((i) => SEX_RE.test(i.code) && i.code.startsWith(prefix + '_'))
      return { prefix, label: sample ? sample.label.split(' · ')[0] : prefix }
    })
    return {
      type: 'sex', cols: ['M', 'F'], colLabels: SEX_LABELS, rows,
      get: (prefix, col) => indicators.find((i) => i.code === `${prefix}_${col}`),
    }
  }

  return { type: 'flat', cols: [], colLabels: {}, rows: [], get: () => undefined }
}

export function NumInput({
  ind, values, onChange,
}: {
  ind: Indicator | undefined
  values: Record<string, { value: string; note: string }>
  onChange: (id: string, field: 'value' | 'note', val: string) => void
}) {
  if (!ind) return <td className="px-2 py-1.5 text-center text-gray-200 dark:text-gray-700">—</td>
  return (
    <td className="px-1.5 py-1">
      <input
        type="number"
        min="0"
        placeholder="—"
        value={values[ind.id]?.value || ''}
        onChange={(e) => onChange(ind.id, 'value', e.target.value)}
        className="w-full px-2 py-1 border border-gray-200 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400 text-right"
      />
    </td>
  )
}

export function GridSection({
  category, indicators, values, onChange,
}: {
  category: string
  indicators: Indicator[]
  values: Record<string, { value: string; note: string }>
  onChange: (id: string, field: 'value' | 'note', val: string) => void
}) {
  const grid = detectGrid(indicators)

  if (grid.type === 'flat') {
    return (
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {indicators.map((ind) => (
          <div key={ind.id} className="px-5 py-3 grid grid-cols-12 gap-3 items-center">
            <div className="col-span-5">
              <p className="text-sm text-gray-900 dark:text-white">
                {ind.label}
                {ind.isRequired && <span className="text-red-400 ml-1">*</span>}
                {ind.unit && <span className="text-gray-400 text-xs ml-1">({ind.unit})</span>}
              </p>
              {ind.description && <p className="text-xs text-gray-400 mt-0.5">{ind.description}</p>}
            </div>
            <div className="col-span-3">
              <input
                type="number" min="0" placeholder="Valeur"
                value={values[ind.id]?.value || ''}
                onChange={(e) => onChange(ind.id, 'value', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400 text-right"
              />
            </div>
            <div className="col-span-4">
              <input
                type="text" placeholder="Note (optionnel)"
                value={values[ind.id]?.note || ''}
                onChange={(e) => onChange(ind.id, 'note', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (grid.type === 'agesex') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
              <th rowSpan={2} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 w-36 align-bottom">
                {category}
              </th>
              {AGE_CODES.map((age) => (
                <th key={age} colSpan={2} className="px-2 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 border-l border-gray-200 dark:border-gray-700 min-w-[88px]">
                  {AGE_LABELS[age]}
                </th>
              ))}
              <th rowSpan={2} className="px-2 py-2 text-center text-xs font-semibold text-brand-500 min-w-[60px] align-bottom">Total</th>
            </tr>
            <tr className="bg-gray-50 dark:bg-gray-800/60">
              {AGE_CODES.flatMap((age) => [
                <th key={`${age}_M`} className="px-1.5 py-1 text-center text-xs font-semibold text-blue-600 dark:text-blue-400 border-l border-gray-200 dark:border-gray-700 min-w-[42px]">M</th>,
                <th key={`${age}_F`} className="px-1.5 py-1 text-center text-xs font-semibold text-pink-500 dark:text-pink-400 min-w-[42px]">F</th>,
              ])}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {grid.rows.map(({ prefix, label }) => {
              const rowInds = AGESEX_COLS.map((col) => grid.get(prefix, col))
              const total = rowInds.reduce((sum, ind) => {
                const v = ind ? Number(values[ind.id]?.value || 0) : 0
                return sum + (isNaN(v) ? 0 : v)
              }, 0)
              const hasAny = rowInds.some((ind) => ind && values[ind.id]?.value !== '')
              return (
                <tr key={prefix} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                  <td className="px-4 py-1.5">
                    <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">{label}</span>
                  </td>
                  {rowInds.map((ind, ci) => (
                    <NumInput key={ci} ind={ind} values={values} onChange={onChange} />
                  ))}
                  <td className="px-2 py-1.5 text-center">
                    <span className={`text-sm font-semibold tabular-nums ${hasAny ? 'text-brand-600 dark:text-brand-400' : 'text-gray-300 dark:text-gray-600'}`}>
                      {hasAny ? total : '—'}
                    </span>
                  </td>
                </tr>
              )
            })}
            <tr className="bg-brand-50/40 dark:bg-brand-900/10 font-semibold">
              <td className="px-4 py-2 text-xs font-bold text-brand-700 dark:text-brand-400 uppercase tracking-wide">Total</td>
              {AGESEX_COLS.map((col) => {
                const colTotal = grid.rows.reduce((sum, { prefix }) => {
                  const ind = grid.get(prefix, col)
                  const v = ind ? Number(values[ind.id]?.value || 0) : 0
                  return sum + (isNaN(v) ? 0 : v)
                }, 0)
                const hasAny = grid.rows.some(({ prefix }) => {
                  const ind = grid.get(prefix, col)
                  return ind && values[ind.id]?.value !== ''
                })
                return (
                  <td key={col} className="px-1.5 py-2 text-center text-sm font-bold text-brand-600 dark:text-brand-400 tabular-nums">
                    {hasAny ? colTotal : '—'}
                  </td>
                )
              })}
              <td className="px-2 py-2 text-center text-sm font-bold text-brand-700 dark:text-brand-300 tabular-nums">
                {(() => {
                  const grandTotal = grid.rows.reduce((sum, { prefix }) =>
                    sum + AGESEX_COLS.reduce((s, col) => {
                      const ind = grid.get(prefix, col)
                      const v = ind ? Number(values[ind.id]?.value || 0) : 0
                      return s + (isNaN(v) ? 0 : v)
                    }, 0), 0)
                  const hasAny = grid.rows.some(({ prefix }) =>
                    AGESEX_COLS.some((col) => { const ind = grid.get(prefix, col); return ind && values[ind.id]?.value !== '' })
                  )
                  return hasAny ? grandTotal : '—'
                })()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  // Age-only / sex-only grid
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800/50">
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 w-48">{category}</th>
            {grid.cols.map((col) => (
              <th key={col} className="px-2 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 min-w-[90px] whitespace-pre-line">
                {grid.colLabels[col]}
              </th>
            ))}
            <th className="px-2 py-2 text-center text-xs font-semibold text-brand-500 min-w-[70px]">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {grid.rows.map(({ prefix, label }) => {
            const rowInds = grid.cols.map((col) => grid.get(prefix, col))
            const total = rowInds.reduce((sum, ind) => {
              const v = ind ? Number(values[ind.id]?.value || 0) : 0
              return sum + (isNaN(v) ? 0 : v)
            }, 0)
            const hasAny = rowInds.some((ind) => ind && values[ind.id]?.value !== '')
            return (
              <tr key={prefix} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                <td className="px-4 py-1.5">
                  <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">{label}</span>
                </td>
                {rowInds.map((ind, ci) => (
                  <NumInput key={ci} ind={ind} values={values} onChange={onChange} />
                ))}
                <td className="px-2 py-1.5 text-center">
                  <span className={`text-sm font-semibold tabular-nums ${hasAny ? 'text-brand-600 dark:text-brand-400' : 'text-gray-300 dark:text-gray-600'}`}>
                    {hasAny ? total : '—'}
                  </span>
                </td>
              </tr>
            )
          })}
          <tr className="bg-brand-50/40 dark:bg-brand-900/10 font-semibold">
            <td className="px-4 py-2 text-xs font-bold text-brand-700 dark:text-brand-400 uppercase tracking-wide">Total</td>
            {grid.cols.map((col) => {
              const colTotal = grid.rows.reduce((sum, { prefix }) => {
                const ind = grid.get(prefix, col)
                const v = ind ? Number(values[ind.id]?.value || 0) : 0
                return sum + (isNaN(v) ? 0 : v)
              }, 0)
              const hasAny = grid.rows.some(({ prefix }) => {
                const ind = grid.get(prefix, col)
                return ind && values[ind.id]?.value !== ''
              })
              return (
                <td key={col} className="px-2 py-2 text-center text-sm font-bold text-brand-600 dark:text-brand-400 tabular-nums">
                  {hasAny ? colTotal : '—'}
                </td>
              )
            })}
            <td className="px-2 py-2 text-center text-sm font-bold text-brand-700 dark:text-brand-300 tabular-nums">
              {(() => {
                const grandTotal = grid.rows.reduce((sum, { prefix }) =>
                  sum + grid.cols.reduce((s, col) => {
                    const ind = grid.get(prefix, col)
                    const v = ind ? Number(values[ind.id]?.value || 0) : 0
                    return s + (isNaN(v) ? 0 : v)
                  }, 0), 0)
                const hasAny = grid.rows.some(({ prefix }) =>
                  grid.cols.some((col) => { const ind = grid.get(prefix, col); return ind && values[ind.id]?.value !== '' })
                )
                return hasAny ? grandTotal : '—'
              })()}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export const CATEGORY_ICONS: Record<string, string> = {
  'Consultations':        '🏥',
  'Hospitalisations':     '🛏️',
  'Bloc opératoire':      '🔪',
  'Services spécialisés': '⚕️',
  'Imagerie médicale':    '📷',
  'Laboratoire':          '🧪',
  'Programmes de santé':  '💉',
  'Maladies notifiables': '🦠',
  'Morbidité & mortalité':'📊',
  'Ressources humaines':  '👥',
  'Activités sociales':   '🤝',
}
