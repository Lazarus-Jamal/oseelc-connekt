import type { Metadata } from 'next'
import Image from 'next/image'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = { title: 'Connexion' }

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800">
      <div className="w-full max-w-md px-4">
        {/* Logo & titre */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-white mb-4 shadow-lg p-2">
            <Image src="/logo.png" alt="OSEELC" width={80} height={80} className="object-contain" priority />
          </div>
          <h1 className="text-3xl font-bold text-white">Oseelc-connekt</h1>
          <p className="text-brand-300 mt-1 text-sm">Plateforme de gestion sanitaire — OSEELC</p>
        </div>

        {/* Formulaire */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Connexion</h2>
          <LoginForm />
        </div>

        <p className="text-center text-brand-400 text-xs mt-6">
          © {new Date().getFullYear()} Oseelc-connekt — OSEELC
        </p>
      </div>
    </div>
  )
}
