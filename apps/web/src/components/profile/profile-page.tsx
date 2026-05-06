'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { PageHeader } from '@/components/ui/page-header'
import { ROLES_LABELS, FACILITY_TYPE_LABELS } from '@care-connekt/shared'
import {
  User, Lock, Phone, Mail, Building2, MapPin, Calendar, Shield,
  CheckCircle, AlertCircle, Eye, EyeOff, Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ProfileData {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  avatarUrl: string | null
  lastLoginAt: string | null
  createdAt: string
  facility: { id: string; name: string; type: string; region: { name: string } } | null
  region: { id: string; name: string } | null
  organization: { id: string; name: string } | null
}

function Toast({ type, message, onClose }: { type: 'success' | 'error'; message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm font-medium transition-all ${
      type === 'success'
        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
        : 'bg-red-50 text-red-800 border border-red-200'
    }`}>
      {type === 'success'
        ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        : <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
      {message}
    </div>
  )
}

function PasswordInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  )
}

function InputField({ label, value, onChange, type = 'text', disabled = false, icon: Icon, placeholder }: {
  label: string
  value: string
  onChange?: (v: string) => void
  type?: string
  disabled?: boolean
  icon?: React.ElementType
  placeholder?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />}
        <input
          type={type}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full ${Icon ? 'pl-10' : 'px-4'} pr-4 py-2.5 rounded-xl border text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent ${
            disabled
              ? 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
          }`}
        />
      </div>
    </div>
  )
}

export function ProfilePage() {
  const { data: session, update: updateSession } = useSession()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Info form
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [savingInfo, setSavingInfo] = useState(false)

  // Password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setProfile(data.data)
          setName(data.data.name)
          setPhone(data.data.phone || '')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const showToast = (type: 'success' | 'error', message: string) => setToast({ type, message })

  const saveInfo = async () => {
    setSavingInfo(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() || null }),
      })
      const data = await res.json()
      if (data.success) {
        setProfile((p) => p ? { ...p, name: data.data.name, phone: data.data.phone } : p)
        await updateSession({ name: data.data.name })
        showToast('success', 'Profil mis à jour avec succès')
      } else {
        showToast('error', data.error || 'Erreur lors de la mise à jour')
      }
    } catch {
      showToast('error', 'Erreur réseau')
    } finally {
      setSavingInfo(false)
    }
  }

  const savePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('error', 'Tous les champs sont requis')
      return
    }
    if (newPassword !== confirmPassword) {
      showToast('error', 'Les mots de passe ne correspondent pas')
      return
    }
    if (newPassword.length < 8) {
      showToast('error', 'Le nouveau mot de passe doit contenir au moins 8 caractères')
      return
    }
    setSavingPassword(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      })
      const data = await res.json()
      if (data.success) {
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        showToast('success', 'Mot de passe modifié avec succès')
      } else {
        showToast('error', data.error || 'Erreur lors du changement de mot de passe')
      }
    } catch {
      showToast('error', 'Erreur réseau')
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) return null

  const initials = profile.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
  const passwordStrength = newPassword.length === 0 ? 0 : newPassword.length < 8 ? 1 : newPassword.length < 12 ? 2 : 3
  const strengthLabel = ['', 'Faible', 'Moyen', 'Fort']
  const strengthColor = ['', 'bg-red-400', 'bg-orange-400', 'bg-emerald-400']

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Mon profil"
        description="Gérez vos informations personnelles et votre sécurité"
      />

      {/* Avatar hero card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 flex items-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center text-white text-2xl font-bold shadow-lg flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">{profile.name}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">{profile.email}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 text-xs font-semibold border border-brand-100 dark:border-brand-500/20">
              <Shield className="w-3 h-3" />
              {ROLES_LABELS[profile.role] || profile.role}
            </span>
            {profile.lastLoginAt && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                Dernière connexion : {format(new Date(profile.lastLoginAt), "d MMM yyyy 'à' HH:mm", { locale: fr })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal info */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-500/15 flex items-center justify-center">
              <User className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Informations personnelles</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">Nom et coordonnées</p>
            </div>
          </div>

          <div className="space-y-4">
            <InputField
              label="Nom complet"
              value={name}
              onChange={setName}
              icon={User}
              placeholder="Votre nom complet"
            />
            <InputField
              label="Email"
              value={profile.email}
              icon={Mail}
              disabled
            />
            <InputField
              label="Téléphone"
              value={phone}
              onChange={setPhone}
              icon={Phone}
              placeholder="+243 xxx xxx xxx"
            />
          </div>

          <button
            onClick={saveInfo}
            disabled={savingInfo || !name.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
          >
            {savingInfo && <Loader2 className="w-4 h-4 animate-spin" />}
            {savingInfo ? 'Sauvegarde…' : 'Sauvegarder les modifications'}
          </button>
        </div>

        {/* Password */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-500/15 flex items-center justify-center">
              <Lock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Sécurité</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">Changer le mot de passe</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Mot de passe actuel
              </label>
              <PasswordInput value={currentPassword} onChange={setCurrentPassword} placeholder="Votre mot de passe actuel" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Nouveau mot de passe
              </label>
              <PasswordInput value={newPassword} onChange={setNewPassword} placeholder="Minimum 8 caractères" />
              {newPassword.length > 0 && (
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 flex gap-1">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          i <= passwordStrength ? strengthColor[passwordStrength] : 'bg-gray-100 dark:bg-gray-800'
                        }`}
                      />
                    ))}
                  </div>
                  <span className={`text-xs font-medium ${
                    passwordStrength === 1 ? 'text-red-500' : passwordStrength === 2 ? 'text-orange-500' : 'text-emerald-500'
                  }`}>
                    {strengthLabel[passwordStrength]}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Confirmer le mot de passe
              </label>
              <PasswordInput value={confirmPassword} onChange={setConfirmPassword} placeholder="Répéter le nouveau mot de passe" />
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
              )}
            </div>
          </div>

          <button
            onClick={savePassword}
            disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
          >
            {savingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
            {savingPassword ? 'Modification…' : 'Changer le mot de passe'}
          </button>
        </div>
      </div>

      {/* Account info — read only */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Informations du compte</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
            <Shield className="w-4 h-4 text-brand-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Rôle</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate mt-0.5">
                {ROLES_LABELS[profile.role] || profile.role}
              </p>
            </div>
          </div>

          {profile.facility && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
              <Building2 className="w-4 h-4 text-brand-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                  {FACILITY_TYPE_LABELS[profile.facility.type] || 'Formation'}
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate mt-0.5">{profile.facility.name}</p>
              </div>
            </div>
          )}

          {(profile.region || profile.facility?.region) && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
              <MapPin className="w-4 h-4 text-brand-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Région</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate mt-0.5">
                  {profile.region?.name || profile.facility?.region.name}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
            <Calendar className="w-4 h-4 text-brand-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Membre depuis</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">
                {format(new Date(profile.createdAt), 'd MMM yyyy', { locale: fr })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      )}
    </div>
  )
}
