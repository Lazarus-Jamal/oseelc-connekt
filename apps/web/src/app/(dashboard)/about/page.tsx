import { PageHeader } from '@/components/ui/page-header'
import { Heart, Code2, DollarSign, Stethoscope, Users } from 'lucide-react'

const DIRECTION = [
  {
    name: 'Rev DJOULDE Jean Marc',
    role: "Directeur de l'Œuvre de Santé",
    icon: Stethoscope,
    color: 'bg-blue-50 text-blue-600 border-blue-100',
    ring: 'bg-blue-600',
  },
  {
    name: 'M. BETROGO Jacob',
    role: 'Chef Service des Affaires Financières',
    icon: DollarSign,
    color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    ring: 'bg-emerald-600',
  },
  {
    name: 'Lazarus Samaki',
    role: 'Chef Service Informatique & Développeur',
    icon: Code2,
    color: 'bg-violet-50 text-violet-600 border-violet-100',
    ring: 'bg-violet-600',
  },
]

const CONSULTANTS = [
  { name: 'SANDA Benjamin',    initials: 'SB' },
  { name: 'Dr SALPOU Daniel',  initials: 'SD' },
  { name: 'SANDA Guilbert',    initials: 'SG' },
]

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-10 py-2">
      <PageHeader
        title="À propos"
        description="Oseelc-Connekt — Système de gestion sanitaire"
      />

      {/* Présentation */}
      <section className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center mx-auto mb-4">
          <Heart className="w-8 h-8 text-brand-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Oseelc-Connekt</h2>
        <p className="text-sm text-gray-500 leading-relaxed max-w-lg mx-auto">
          Plateforme numérique de gestion sanitaire de l'Œuvre de Santé de l'EELC,
          conçue pour le suivi des déclarations, des statistiques, des rapports financiers
          et de la coordination des formations sanitaires.
        </p>
        <p className="text-xs text-gray-400 mt-4">Version 1.0 · 2026</p>
      </section>

      {/* Équipe de conception */}
      <section>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-1">
          Équipe de conception
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {DIRECTION.map(({ name, role, icon: Icon, color, ring }) => (
            <div
              key={name}
              className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-3 ${color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className={`w-10 h-1 rounded-full mb-3 ${ring} opacity-20`} />
              <p className="font-semibold text-gray-900 text-sm leading-snug">{name}</p>
              <p className="text-xs text-gray-400 mt-1 leading-snug">{role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Consultants */}
      <section>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-1">
          Consultants &amp; Contributeurs Permanents
        </h3>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">
          {CONSULTANTS.map(({ name, initials }) => (
            <div key={name} className="flex items-center gap-4 px-6 py-4">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-sm font-bold flex-shrink-0">
                {initials}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{name}</p>
                <p className="text-xs text-gray-400">Consultant &amp; Contributeur Permanent</p>
              </div>
              <Users className="w-4 h-4 text-gray-300 ml-auto" />
            </div>
          ))}
        </div>
      </section>

      {/* Mention légale */}
      <p className="text-center text-xs text-gray-300 pb-4">
        © 2026 Œuvre de Santé de l'EELC — Tous droits réservés
      </p>
    </div>
  )
}
