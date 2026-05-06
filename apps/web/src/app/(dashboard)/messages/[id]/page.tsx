import { MessageDetailPage } from '@/components/messages/message-detail-page'

export const metadata = { title: 'Message' }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <MessageDetailPage id={id} />
}
