'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Loader2, Save, Send, Building2, MapPin, CheckCircle2, Circle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/page-header'
import { MONTHS_FR } from '@care-connekt/shared'
import { Indicator, GridSection, CATEGORY_ICONS } from './stat-grid'

interface Facility {
  id: string
  name: string
  type: string
  region: { id: string; name: string }
}

export function StatSheetFormPage() {
  const router = useRouter()
  const { data: session } = useSession()

  const role = session?.user?.role || ''
  const currentDate = new Date()

  const [facilities, setFacilities] = useState<Facility[]>([])
  const [facilityId, setFacilityId] = useState('')
  const [facilitiesLoading, setFacilitiesLoading] = useState(true)

  const [month, setMonth] = useState(currentDate.getMonth() + 1)
  const [year, setYear] = useState(currentDate.getFullYear())
  const [indicators, setIndicators] = useState<Indicator[]>([])
  const [values, setValues] = useState<Record<string, { value: string; note: string }>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [existingDraft, setExistingDraft] = useState<{ id: string; reference: string } | null>(null)

  useEffect(() => {
    if (!session) return
    const params = new URLSearchParams({ limit: '200' })
    const userFacilityId = (session.user as any).facilityId
    const userRegionId   = (session.user as any).regionId
    if (role === 'DATA_MANAGER' && userFacilityId) {
      params.set('facilityId', userFacilityId)
    } else if (role === 'DATA_MANAGER' && userRegionId) {
      params.set('regionId', userRegionId)
    }
    fetch(`/api/facilities?${params}`)
      .then((r) => r.json())
      .then((d) => { setFacilities(d.data || []) })
      .catch(() => {})
      .finally(() => setFacilitiesLoading(false))
  }, [session, role])

  useEffect(() => {
    fetch('/api/admin/indicators')
      .then((r) => r.json())
      .then((d) => {
        const inds: Indicator[] = d.data || []
        setIndicators(inds)
        const init: Record<string, { value: string; note: string }> = {}
        inds.forEach((i) => { init[i.id] = { value: '', note: '' } })
        setValues(init)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!facilityId) { setExistingDraft(null); return }
    const params = new URLSearchParams({ facilityId, month: String(month), year: String(year), status: 'DRAFT' })
    fetch(`/api/statistics?${params}`)
      .then((r) => r.json())
      .then((d) => {
        const draft = (d.data || [])[0]
        setExistingDraft(draft ? { id: draft.id, reference: draft.reference } : null)
      })
      .catch(() => setExistingDraft(null))
  }, [facilityId, month, year])

  const selectedFacility = facilities.find((f) => f.id === facilityId)

  const onChange = (id: string, field: 'value' | 'note', val: string) => {
    if (field === 'value' && val !== '' && Number(val) < 0) return
    setValues((prev) => ({ ...prev, [id]: { ...prev[id], [field]: val } }))
  }

  const byCategory = indicators.reduce((acc, ind) => {
    if (!acc[ind.category]) acc[ind.category] = []
    acc[ind.category].push(ind)
    return acc
  }, {} as Record<string, Indicator[]>)

  const filledCount = Object.values(values).filter((v) => v.value !== '').length
  const completeness = indicators.length > 0 ? Math.round((filledCount / indicators.length) * 100) : 0

  const save = async (submit: boolean) => {
    if (!facilityId) { toast.error('Veuillez sélectionner un centre ou hôpital'); return }
    setSubmitting(true)
    try {
      const payload = {
        facilityId,
        month, year,
        values: indicators.map((ind) => ({
          indicatorId: ind.id,
          value: values[ind.id]?.value !== '' ? Number(values[ind.id]?.value) : undefined,
          note: values[ind.id]?.note || undefined,
        })),
      }
      const res = await fetch('/api/statistics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)

      if (submit) {
        await fetch(`/api/statistics/${result.data.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'submit' }),
        })
        toast.success('Fiche soumise avec succès')
      } else {
        toast.success('Fiche enregistrée en brouillon')
      }
      router.push(`/statistics/${result.data.id}`)
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de l\'enregistrement')
    } finally {
      setSubmitting(false)
    }
  }

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i)

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
        <Link href="/statistics" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <PageHeader title="Nouvelle fiche statistique" description="Saisissez les indicateurs de santé du mois" />
      </div>

      {/* Sélection du centre */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 mb-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm flex items-center gap-2">
          <Building2 className="w-4 h-4 text-brand-500" />
          Formation sanitaire de destination
        </h3>
        {facilitiesLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Chargement des centres…
          </div>
        ) : facilities.length === 0 ? (
          <p className="text-sm text-orange-600">Aucun centre disponible pour votre région.</p>
        ) : (
          <div className="space-y-3">
            <select
              value={facilityId}
              onChange={(e) => { setFacilityId(e.target.value); setCurrentStep(0) }}
              className="w-full max-w-md px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">— Choisir un centre ou hôpital —</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.type === 'HOSPITAL' ? 'Hôpital' : 'Centre de Santé'})
                </option>
              ))}
            </select>
            {selectedFacility && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <MapPin className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                <span>
                  {selectedFacility.type === 'HOSPITAL' ? 'Hôpital' : 'Centre de Santé'} ·{' '}
                  <span className="font-medium text-gray-700 dark:text-gray-300">{selectedFacility.region.name}</span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Période */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 mb-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm">Période de collecte</h3>
        <div className="flex gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Mois</label>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
              className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500">
              {MONTHS_FR.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Année</label>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))}
              className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {existingDraft && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 mb-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Un brouillon existe déjà pour cette période ({existingDraft.reference})
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
              Vous pouvez continuer la saisie de ce brouillon plutôt que d'en créer un nouveau.
            </p>
          </div>
          <Link
            href={`/statistics/${existingDraft.id}/edit`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition flex-shrink-0"
          >
            Continuer ce brouillon
          </Link>
        </div>
      )}

      {!facilityId && !facilitiesLoading && (
        <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 rounded-2xl p-6 text-center mb-5">
          <Building2 className="w-8 h-8 text-brand-400 mx-auto mb-2" />
          <p className="text-brand-700 dark:text-brand-300 font-medium text-sm">
            Sélectionnez un centre ou hôpital ci-dessus pour commencer la saisie.
          </p>
        </div>
      )}

      {facilityId && loading && (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {facilityId && !loading && indicators.length === 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-8 text-center">
          <p className="text-orange-700 dark:text-orange-400 font-semibold text-lg mb-1">Aucun indicateur configuré</p>
          <p className="text-orange-600 dark:text-orange-500 text-sm">
            Allez dans <strong>Admin → Indicateurs statistiques</strong> et cliquez sur <strong>« Charger les indicateurs »</strong>.
          </p>
        </div>
      )}

      {facilityId && !loading && totalSteps > 0 && (
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
                const filled   = stepFilled(cat)
                const total    = stepTotal(cat)
                const done     = filled === total && total > 0
                const partial  = filled > 0 && !done
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
              <Link href="/statistics" className="px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-gray-600 transition">
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
