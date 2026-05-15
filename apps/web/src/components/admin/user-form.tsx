'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { User, Mail, Phone, Shield, Building2, MapPin, Loader2, X, AlertCircle } from 'lucide-react'
import { ROLES_LABELS } from '@care-connekt/shared'

const schema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Adresse email invalide'),
  phone: z.string().optional().nullable(),
  role: z.enum(['SUPER_ADMIN', 'DATA_ADMIN', 'DIRECTION', 'REGIONAL_DIRECTOR', 'FACILITY_CHIEF', 'FINANCIER', 'DATA_MANAGER', 'CONTROLEUR', 'CONTROLEUR_REGIONAL', 'CAISSIER']),
  regionId: z.string().optional().nullable(),
  facilityId: z.string().optional().nullable(),
  organizationId: z.string().optional().nullable(),
}).refine((data) => {
  if (['REGIONAL_DIRECTOR', 'CONTROLEUR_REGIONAL'].includes(data.role) && !data.regionId) return false
  if (['FACILITY_CHIEF', 'FINANCIER', 'CAISSIER'].includes(data.role) && !data.facilityId) return false
  return true
}, {
  message: "La région ou la formation sanitaire est requise pour ce rôle",
  path: ["regionId"],
})

type FormData = z.infer<typeof schema>

interface UserFormProps {
  initialData?: any
  onSuccess: (tempPassword?: string) => void
  onCancel: () => void
  facilities: any[]
  regions: any[]
}

export function UserForm({ initialData, onSuccess, onCancel, facilities, regions }: UserFormProps) {
  const [error, setError] = useState<string | null>(null)
  const isEditing = !!initialData
  
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialData ? {
      name: initialData.name,
      email: initialData.email,
      phone: initialData.phone || '',
      role: initialData.role,
      regionId: initialData.regionId || initialData.region?.id || '',
      facilityId: initialData.facilityId || initialData.facility?.id || '',
      organizationId: initialData.organizationId || '',
    } : { role: 'FINANCIER' },
  })

  const selectedRole = watch('role')

  const onSubmit = async (data: FormData) => {
    setError(null)
    try {
      const url = isEditing ? `/api/users/${initialData.id}` : '/api/users'
      const method = isEditing ? 'PATCH' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error || 'Une erreur est survenue')
      onSuccess(result.data?.tempPassword)
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 max-w-xl w-full animate-in fade-in zoom-in duration-300">
      <div className={`bg-gradient-to-r ${isEditing ? 'from-orange-500 to-orange-700' : 'from-brand-600 to-brand-800'} p-6 text-white relative overflow-hidden`}>
        <div className="relative z-10">
          <h3 className="text-xl font-bold">{isEditing ? 'Modifier l\'utilisateur' : 'Nouvel Utilisateur'}</h3>
          <p className="text-brand-100 text-sm mt-1">
            {isEditing ? `Modification du compte de ${initialData.name}` : 'Créez un nouvel accès à la plateforme'}
          </p>
        </div>
        <button onClick={onCancel} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors z-20">
          <X className="w-5 h-5" />
        </button>
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-24 h-24 bg-brand-400/20 rounded-full blur-2xl" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 flex items-center gap-3 text-red-600 dark:text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase ml-1">Nom Complet</label>
            <div className="relative group">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-500" />
              <input {...register('name')} placeholder="Ex: Jean Mukendi" className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-0 rounded-2xl text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            {errors.name && <p className="text-[11px] text-red-500 ml-1">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase ml-1">Email Professionnel</label>
            <div className="relative group">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-500" />
              <input {...register('email')} type="email" placeholder="jean.m@oseelc.org" className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-0 rounded-2xl text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            {errors.email && <p className="text-[11px] text-red-500 ml-1">{errors.email.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase ml-1">Rôle</label>
            <div className="relative group">
              <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-500" />
              <select {...register('role')} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-0 rounded-2xl text-sm focus:ring-2 focus:ring-brand-500 outline-none appearance-none">
                {Object.entries(ROLES_LABELS).map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase ml-1">Téléphone (Optionnel)</label>
            <div className="relative group">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-500" />
              <input {...register('phone')} placeholder="+243..." className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-0 rounded-2xl text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
          </div>
        </div>

        <div className="bg-brand-50/50 dark:bg-brand-900/10 p-4 rounded-2xl border border-brand-100/50 dark:border-brand-800/20 space-y-4">
          {['REGIONAL_DIRECTOR', 'CONTROLEUR_REGIONAL', 'DATA_MANAGER'].includes(selectedRole) && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase ml-1">Région Sanitaire</label>
              <div className="relative group">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-500" />
                <select {...register('regionId')} className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border-0 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 shadow-sm outline-none">
                  <option value="">-- Sélectionner la région --</option>
                  {regions.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>
          )}
          {['FACILITY_CHIEF', 'FINANCIER', 'CAISSIER', 'DATA_MANAGER'].includes(selectedRole) && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase ml-1">Formation Sanitaire (FOSA)</label>
              <div className="relative group">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-500" />
                <select {...register('facilityId')} className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border-0 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 shadow-sm outline-none">
                  <option value="">-- Sélectionner la formation --</option>
                  {facilities.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onCancel} className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-colors">
            Annuler
          </button>
          <button type="submit" disabled={isSubmitting} className="flex-[2] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-2xl disabled:opacity-50 shadow-lg shadow-brand-500/30 transition-all active:scale-95">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
            {isSubmitting ? (isEditing ? 'Mise à jour...' : 'Création...') : (isEditing ? 'Enregistrer' : 'Créer le compte')}
          </button>
        </div>
      </form>
    </div>
  )
}
