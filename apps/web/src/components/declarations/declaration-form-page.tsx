'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, ArrowLeft, Upload, X, FileText, ImageIcon, User, Building2 } from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/page-header'
import { DECLARATION_CATEGORIES, formatCurrency, formatFileSize } from '@care-connekt/shared'

const DEFAULT_CATEGORIES = DECLARATION_CATEGORIES as readonly string[]

const itemSchema = z.object({
  label: z.string().min(1, 'Libellé requis'),
  category: z.string().min(1, 'Catégorie requise'),
  amount: z.number({ invalid_type_error: 'Montant invalide' }).nonnegative('Montant positif requis'),
  quantity: z.number().int().optional(),
  note: z.string().optional(),
})

const schema = z.object({
  periodType: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  periodStart: z.string().min(1, 'Date de début requise'),
  periodEnd: z.string().min(1, 'Date de fin requise'),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Au moins une ligne requise'),
})

type FormData = z.infer<typeof schema>

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_SIZE = 10 * 1024 * 1024

interface DeclarationFormPageProps {
  editId?: string
}

export function DeclarationFormPage({ editId }: DeclarationFormPageProps = {}) {
  const router = useRouter()
  const { data: session } = useSession()
  const [submitting, setSubmitting] = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(!!editId)
  const [files, setFiles] = useState<File[]>([])
  const [facilityId, setFacilityId] = useState('')
  const [facilities, setFacilities] = useState<{ id: string; name: string; type: string }[]>([])
  const [categories, setCategories] = useState<string[]>([...DEFAULT_CATEGORIES])
  const [newCatName, setNewCatName] = useState('')
  const [addingCat, setAddingCat] = useState(false)
  const [showAddCat, setShowAddCat] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!session?.user?.facilityId) {
      fetch('/api/facilities?limit=100')
        .then((r) => r.json())
        .then((d) => { if (d.success) setFacilities(d.data) })
    }
    fetch('/api/categories?type=REVENUE')
      .then((r) => r.json())
      .then((d) => { if (d.success) setCategories(d.data.map((c: { name: string }) => c.name)) })
  }, [session?.user?.facilityId])

  const addCategory = async () => {
    const name = newCatName.trim()
    if (!name) return
    setAddingCat(true)
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, declarationType: 'REVENUE' }),
    })
    const data = await res.json()
    if (data.success) {
      setCategories((prev) => [...prev, name])
      setNewCatName('')
      setShowAddCat(false)
    }
    setAddingCat(false)
  }

  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      periodType: 'DAILY',
      periodStart: new Date().toISOString().split('T')[0],
      periodEnd: new Date().toISOString().split('T')[0],
      notes: '',
      items: [{ label: '', category: DECLARATION_CATEGORIES[0], amount: 0, note: '' }],
    },
  })

  useEffect(() => {
    if (!editId) return
    setLoadingEdit(true)
    fetch(`/api/declarations/${editId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const dec = d.data
          setFacilityId(dec.facilityId)
          reset({
            periodType: dec.periodType,
            periodStart: dec.periodStart.split('T')[0],
            periodEnd: dec.periodEnd.split('T')[0],
            notes: dec.comment || '',
            items: dec.items.map((item: any) => ({
              label: item.label,
              category: item.category,
              amount: Number(item.amount),
              quantity: item.quantity ?? undefined,
              note: item.note || '',
            })),
          })
        }
      })
      .finally(() => setLoadingEdit(false))
  }, [editId, reset])

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const items = watch('items')
  const totalAmount = items?.reduce((s, i) => s + (Number(i.amount) || 0), 0) || 0

  const today = new Date().toLocaleDateString('en-CA')

  const periodType = watch('periodType')
  const periodStart = watch('periodStart')
  useEffect(() => {
    if (periodType === 'DAILY' && periodStart) setValue('periodEnd', periodStart)
  }, [periodType, periodStart, setValue])

  const addFile = (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Type non autorisé (JPEG, PNG, WebP, PDF uniquement)')
      return
    }
    if (file.size > MAX_SIZE) {
      toast.error('Fichier trop volumineux (max 10 Mo)')
      return
    }
    if (files.some((f) => f.name === file.name && f.size === file.size)) {
      toast.error('Ce fichier est déjà ajouté')
      return
    }
    setFiles((prev) => [...prev, file])
  }

  const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index))

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    Array.from(e.dataTransfer.files).forEach(addFile)
  }

  const onSubmit = async (data: FormData) => {
    const finalFacilityId = session?.user?.facilityId || facilityId
    if (!finalFacilityId) {
      toast.error('Veuillez sélectionner une formation sanitaire')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        ...(editId ? {} : { facilityId: finalFacilityId }),
        periodType: data.periodType,
        periodStart: new Date(data.periodStart).toISOString(),
        periodEnd: new Date(data.periodEnd + 'T23:59:59').toISOString(),
        notes: data.notes,
        items: data.items,
      }

      const res = await fetch(editId ? `/api/declarations/${editId}` : '/api/declarations', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)

      const declarationId = editId || result.data.id

      if (files.length > 0) {
        await Promise.all(
          files.map((file) => {
            const formData = new FormData()
            formData.append('file', file)
            return fetch(`/api/declarations/${declarationId}/documents`, {
              method: 'POST',
              body: formData,
            })
          })
        )
      }

      toast.success(editId ? 'Déclaration mise à jour' : 'Déclaration créée avec succès')
      router.push(`/declarations/${declarationId}`)
    } catch (e: any) {
      toast.error(e.message || 'Erreur')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingEdit) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href={editId ? `/declarations/${editId}` : '/declarations'} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <PageHeader
          title={editId ? 'Modifier la déclaration' : 'Nouvelle déclaration de recettes'}
          description={editId ? 'Modifiez les lignes et enregistrez le brouillon' : 'Remplissez le formulaire et ajoutez les pièces justificatives'}
        />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* Soumettant */}
        <div className="bg-brand-50 dark:bg-brand-900/20 rounded-xl border border-brand-100 dark:border-brand-800 px-5 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {session?.user?.name?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-brand-800 dark:text-brand-200">{session?.user?.name}</p>
            <p className="text-xs text-brand-600 dark:text-brand-400">{session?.user?.email}</p>
          </div>
          <span className="ml-auto text-xs font-medium px-2.5 py-1 rounded-full bg-brand-100 dark:bg-brand-800 text-brand-700 dark:text-brand-300">
            Soumettant
          </span>
        </div>

        {/* Sélecteur de formation — SUPER_ADMIN uniquement */}
        {!session?.user?.facilityId && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-500" />
              Formation sanitaire <span className="text-red-400">*</span>
            </h3>
            <select
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Sélectionner une formation sanitaire…</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} — {f.type === 'HOSPITAL' ? 'Hôpital' : 'Centre de Santé'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Période */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Période de déclaration</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type de période</label>
              <select
                {...register('periodType')}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="DAILY">Journalier</option>
                <option value="WEEKLY">Hebdomadaire</option>
                <option value="MONTHLY">Mensuel</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date de soumission</label>
              <input
                type="date"
                max={today}
                {...register('periodStart')}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {errors.periodStart && <p className="mt-1 text-xs text-red-500">{errors.periodStart.message}</p>}
            </div>
            {periodType !== 'DAILY' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date de fin</label>
                <input
                  type="date"
                  max={today}
                  {...register('periodEnd')}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.periodEnd && <p className="mt-1 text-xs text-red-500">{errors.periodEnd.message}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Lignes de recettes */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Lignes de recettes</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddCat((v) => !v)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <Plus className="w-3 h-3" />
                Nouvelle catégorie
              </button>
              <button
                type="button"
                onClick={() => append({ label: '', category: categories[0] || '', amount: 0, note: '' })}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50 transition"
              >
                <Plus className="w-3 h-3" />
                Ajouter une ligne
              </button>
            </div>
          </div>

          {showAddCat && (
            <div className="mb-3 flex gap-2 p-3 bg-brand-50 dark:bg-brand-900/20 rounded-xl border border-brand-100 dark:border-brand-800">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                placeholder="Nom de la catégorie…"
                className="flex-1 px-3 py-1.5 text-sm border border-brand-200 dark:border-brand-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              <button type="button" onClick={addCategory} disabled={addingCat || !newCatName.trim()}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition">
                {addingCat ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Créer
              </button>
              <button type="button" onClick={() => setShowAddCat(false)}
                className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 rounded-lg hover:bg-white transition">
                Annuler
              </button>
            </div>
          )}

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                {/* Ligne principale */}
                <div className="grid grid-cols-12 gap-3 items-start">
                  <div className="col-span-5">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Libellé <span className="text-red-400">*</span></label>
                    <input
                      {...register(`items.${index}.label`)}
                      placeholder="Ex : Consultations prénatales"
                      className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    {errors.items?.[index]?.label && (
                      <p className="mt-0.5 text-xs text-red-500">{errors.items[index]?.label?.message}</p>
                    )}
                  </div>
                  <div className="col-span-4">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Catégorie <span className="text-red-400">*</span></label>
                    <select
                      {...register(`items.${index}.category`)}
                      className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Montant (FCFA) <span className="text-red-400">*</span></label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      {...register(`items.${index}.amount`, { valueAsNumber: true })}
                      placeholder="0"
                      className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    {errors.items?.[index]?.amount && (
                      <p className="mt-0.5 text-xs text-red-500">{errors.items[index]?.amount?.message}</p>
                    )}
                  </div>
                  <div className="col-span-1 flex justify-end pt-6">
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Notes de la ligne */}
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Notes / observations sur cette ligne</label>
                  <textarea
                    {...register(`items.${index}.note`)}
                    rows={2}
                    placeholder="Précisions, détails supplémentaires..."
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="mt-4 flex items-center justify-end gap-3 border-t border-gray-200 dark:border-gray-700 pt-4">
            <span className="text-sm font-medium text-gray-500">Total :</span>
            <span className="text-xl font-bold text-brand-600 dark:text-brand-400">{formatCurrency(totalAmount)}</span>
          </div>
          {errors.items && typeof errors.items === 'object' && 'message' in errors.items && (
            <p className="mt-1 text-xs text-red-500">{(errors.items as any).message}</p>
          )}
        </div>

        {/* Observations générales */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Observations générales</h3>
          <textarea
            {...register('notes')}
            rows={4}
            placeholder="Remarques générales sur cette déclaration, contexte particulier, informations complémentaires..."
            className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>

        {/* Pièces justificatives */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Pièces justificatives</h3>
          <p className="text-xs text-gray-400 mb-4">Images (JPEG, PNG, WebP) ou PDF — max 10 Mo par fichier</p>

          {/* Zone de drop */}
          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-900/10 transition group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => { Array.from(e.target.files || []).forEach(addFile); e.target.value = '' }}
            />
            <Upload className="w-8 h-8 text-gray-300 group-hover:text-brand-400 mx-auto mb-2 transition" />
            <p className="text-sm text-gray-500 group-hover:text-brand-600 transition">
              Glissez vos fichiers ici ou <span className="text-brand-600 font-medium">cliquez pour parcourir</span>
            </p>
          </div>

          {/* Liste des fichiers ajoutés */}
          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((file, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center flex-shrink-0">
                    {file.type === 'application/pdf'
                      ? <FileText className="w-4 h-4 text-red-500" />
                      : <ImageIcon className="w-4 h-4 text-blue-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                    <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/declarations"
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Enregistrement...' : editId ? 'Mettre à jour' : 'Enregistrer en brouillon'}
          </button>
        </div>
      </form>
    </div>
  )
}
