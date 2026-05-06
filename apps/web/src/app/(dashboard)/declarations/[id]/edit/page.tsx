import { DeclarationFormPage } from '@/components/declarations/declaration-form-page'

export default async function EditDeclarationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <DeclarationFormPage editId={id} />
}
