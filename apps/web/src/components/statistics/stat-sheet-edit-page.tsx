'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, ArrowRight, Loader2, Save, Send,
  Building2, MapPin, CheckCircle2, Circle, AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { MONTHS_FR } from '@care-connekt/shared'
import { Indicator, GridSection, CATEGORY_ICONS } from './stat-grid'

interface SheetData {
  id: string
  reference: string
  month: number
  year: number
  status: string
  completeness: number | null
  facility: { id: string; name: string; type: string; region: { id: string; name: string } }
  values: { indicator: Indicator; value: number | null; note: string | null }[]
}

export function StatSheetEditPage({ id }: { id: string }) {
  const router = useRouter()

  const [sheet, setSheet] = useState<SheetData | null>(null)
  const [indicators, setIndicators] = useState<Indicator[]>([])
  const [values, setValues] = useState<Record<string, { value: string; note: string }>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    Promise.all([
      fetch(`/api/statistics/${id}`).then((r) => r.json()),
      fetch('/api/admin/indicators').then((r) => r.json()),
    ]).then(([sheetRes, indRes]) => {
      if (!sheetRes.success) { toast.error('Fiche introuvable'); router.push('/statistics'); return }
      const s: SheetData = sheetRes.data
      if (s.status !== 'DRAFT') {
        toast.error('Seuls les brouillons peuvent être modifiés')
        router.push(`/statistics/${id}`)
        return
      }
      setSheet(s)

      const inds: Indicator[] = indRes.data || []
      setIndicators(inds)

      // Pre-populate values from existing sheet
      const init: Record<string, { value: string; note: string }> = {}
      inds.forEach((ind) => {
        const existing = s.values.find((v) => v.indicator.id === ind.id)
        init[ind.id] = {
          value: existing?.value != null ? String(existing.value) : '',
          note: existing?.note ?? '',
        }
      })
      setValues(init)
      setLoading(false)
    }).catch(() => { toast.error('Erreur de chargement'); setLoading(false) })
  }, [id, router])

  const onChange = (indId: string, field: 'value' | 'note', val: string) => {
    if (field === 'value' && val !== '' && Number(val) < 0) return
    setValues((prev) => ({ ...prev, [indId]: { ...prev[indId], [field]: val } }))
  }

  const byCategory = indicators.reduce((acc, ind) => {
    if (!acc[ind.category]) acc[ind.category] = []
    acc[ind.category].push(ind)
    return acc
  }, {} as Record<string, Indicator[]>)

  const filledCount = Object.values(values).filter((v) => v.value !== '').length
  const completeness = indicators.length > 0 ? Math.round((filledCount / indicators.length) * 100) : 0

  const save = async (submit: boolean) => {
    setSubmitting(true)
    try {
      // Save current values
      const updateRes = await fetch(`/api/statistics/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          values: indicators.map((ind) => ({
            indicatorId: ind.id,
            value: values[ind.id]?.value !== '' ? Number(values[ind.id]?.value) : undefined,
            note: values[ind.id]?.note || undefined,
          })),
        }),
      })
      const updateResult = await updateRes.json()
      if (!updateResult.success) throw new Error(updateResult.error)

      if (submit) {
        const submitRes = await fetch(`/api/statistics/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'submit' }),
        })
        const submitResult = await submitRes.json()
        if (!submitResult.success) throw new Error(submitResult.error)
        toast.success('Fiche soumise avec succès')
      } else {
        toast.success('Brouillon enregistré')
      }

      router.push(`/statistics/${id}`)
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de l\'enregistrement')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!sheet) return null

  const categories = Object.keys(byCategory)
  const totalSteps = categories.length
  const isLastStep = currentStep === totalSteps - 1
  const currentCategory = categories[currentStep] ?? ''
  const currentInds = byCategory[currentCategory] ?? []

  const stepFilled = (cat: string) => (byCategory[cat] ?? []).filter((i) => values[i.id]?.value !== '').length
  const stepTotal  = (cat: string) => (byCategory[cat] ?? []).length
  const goNext = () => setCurrentStep((s) => Math.min(s + 1, totalSteps - 1))
  const goPrev = () => setCurrentStep((s) => Math.max(s - 1, 0))

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/statistics/${id}`} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <PageHeader
          title="Continuer la saisie"
          description={`${sheet.reference} · ${MONTHS_FR[sheet.month - 1]} ${sheet.year}`}
        />
        <StatusBadge status={sheet.status} type="stat" />
      </div>

      {/* Récapitulatif formation */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 mb-5 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            {sheet.facility.name}
            <span className="font-normal text-amber-600 dark:text-amber-400">·</span>
            <MapPin className="w-3.5 h-3.5 text-amber-500" />
            {sheet.facility.region.name}
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
            Vous reprenez un brouillon — la période et la formation ne peuvent pas être modifiées.
          </p>
        </div>
      </div>

      {totalSteps > 0 && (
        <>
          {/* Barre de progression globale */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Progression globale</span>
              <span className={`text-sm font-bold tabular-nums ${completeness >= 80 ? 'text-green-600' : completeness >= 50 ? 'text-orange-500' : 'text-red-500'}`}>
                {filledCount}/{indicators.length} · {completeness}%
              </span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mb-4">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${completeness >= 80 ? 'bg-green-500' : completeness >= 50 ? 'bg-orange-500' : 'bg-red-500'}`}
                style={{ width: `${completeness}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat, idx) => {
                const filled = stepFilled(cat)
                const total  = stepTotal(cat)
                const done    = filled === total && total > 0
                const partial = filled > 0 && !done
                const isCurrent = idx === currentStep
                return (
                  <button
                    key={cat}
                    onClick={() => setCurrentStep(idx)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      isCurrent
                        ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                        : done
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
                        : partial
                        ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {done ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                    <span>{CATEGORY_ICONS[cat] || '📋'} {cat}</span>
                    {!isCurrent && (
                      <span className={`tabular-nums ${done ? 'text-green-600 dark:text-green-400' : partial ? 'text-orange-500' : 'text-gray-400'}`}>
                        {filled}/{total}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Section active */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden mb-4">
            <div className="px-5 py-4 bg-brand-50 dark:bg-brand-900/20 border-b border-brand-100 dark:border-brand-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{CATEGORY_ICONS[currentCategory] || '📋'}</span>
                <div>
                  <h3 className="font-bold text-sm text-brand-800 dark:text-brand-300">{currentCategory}</h3>
                  <p className="text-xs text-brand-500 mt-0.5">Étape {currentStep + 1} sur {totalSteps}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-sm font-bold tabular-nums ${
                  stepFilled(currentCategory) === stepTotal(currentCategory) && stepTotal(currentCategory) > 0
                    ? 'text-green-600 dark:text-green-400'
                    : stepFilled(currentCategory) > 0
                    ? 'text-orange-500'
                    : 'text-gray-400'
                }`}>
                  {stepFilled(currentCategory)}/{stepTotal(currentCategory)} renseignés
                </span>
                <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-1 ml-auto">
                  <div
                    className={`h-1 rounded-full transition-all ${
                      stepFilled(currentCategory) === stepTotal(currentCategory) && stepTotal(currentCategory) > 0
                        ? 'bg-green-500' : 'bg-brand-500'
                    }`}
                    style={{ width: stepTotal(currentCategory) > 0 ? `${Math.round(stepFilled(currentCategory) / stepTotal(currentCategory) * 100)}%` : '0%' }}
                  />
                </div>
              </div>
            </div>
            <GridSection
              category={currentCategory}
              indicators={currentInds}
              values={values}
              onChange={onChange}
            />
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pb-8">
            <div className="flex items-center gap-2">
              <button
                onClick={goPrev}
                disabled={currentStep === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-4 h-4" /> Précédent
              </button>
              <Link href={`/statistics/${id}`} className="px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-gray-600 transition">
                Annuler
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => save(false)}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-xl transition disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Enreg. brouillon
              </button>
              {isLastStep ? (
                <button
                  onClick={() => save(true)}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Soumettre la fiche
                </button>
              ) : (
                <button
                  onClick={goNext}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition"
                >
                  Suivant <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
