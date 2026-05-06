'use client'

import { useState, useEffect } from 'react'
import { Shield, ShieldCheck, Loader2, Mail, Key } from 'lucide-react'
import { toast } from 'sonner'

export function TwoFASettings() {
  const [enabled, setEnabled] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<'idle' | 'otp_sent'>('idle')
  const [otp, setOtp] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    fetch('/api/auth/2fa')
      .then(r => r.json())
      .then(d => {
        if (d.success) { setEnabled(d.data.enabled); setEmail(d.data.email ?? '') }
      })
      .finally(() => setLoading(false))
  }, [])

  const sendOtp = async () => {
    setSending(true)
    try {
      const res = await fetch('/api/auth/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_otp' }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success(json.message)
      setStep('otp_sent')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSending(false)
    }
  }

  const verifyOtp = async () => {
    if (otp.length !== 6) { toast.error('Entrez le code à 6 chiffres'); return }
    setVerifying(true)
    try {
      const res = await fetch('/api/auth/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_otp', otp }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setEnabled(json.data.enabled)
      setStep('idle')
      setOtp('')
      toast.success(json.data.enabled ? '2FA activé avec succès' : '2FA désactivé')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setVerifying(false)
    }
  }

  if (loading) return null

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl ${enabled ? 'bg-teal-100 dark:bg-teal-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
            {enabled
              ? <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              : <Shield className="w-5 h-5 text-gray-400" />
            }
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Authentification à deux facteurs
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {enabled
                ? 'La 2FA est activée. Un code vous sera envoyé par email à chaque connexion.'
                : 'Renforcez la sécurité de votre compte avec un code OTP par email.'}
            </p>
          </div>
        </div>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0
          ${enabled ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
          {enabled ? 'Activé' : 'Désactivé'}
        </span>
      </div>

      {step === 'idle' ? (
        <button
          onClick={sendOtp}
          disabled={sending}
          className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition
            bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          {enabled ? 'Désactiver la 2FA' : 'Activer la 2FA'}
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
            <Mail className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
            <span>Un code a été envoyé à <strong>{email}</strong>. Il expire dans 10 minutes.</span>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <button
              onClick={verifyOtp}
              disabled={verifying || otp.length !== 6}
              className="px-4 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-xl disabled:opacity-50 transition flex items-center gap-1.5"
            >
              {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Confirmer
            </button>
            <button
              onClick={() => { setStep('idle'); setOtp('') }}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
