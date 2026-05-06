import type { Metadata } from 'next'
import { CategoriesPage } from '@/components/categories/categories-page'

export const metadata: Metadata = { title: 'Catégories' }

export default function CategoriesPageRoute() {
  return <CategoriesPage />
}
