import type { Metadata } from 'next'
import { DeclarationFormPage } from '@/components/declarations/declaration-form-page'

export const metadata: Metadata = { title: 'Nouvelle déclaration' }

export default function NewDeclarationPage() {
  return <DeclarationFormPage />
}
