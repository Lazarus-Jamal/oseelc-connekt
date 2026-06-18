import { MessageComposePage } from '@/components/messages/message-compose-page'

export const metadata = { title: 'Nouveau message' }

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams
  return (
    <MessageComposePage
      replyToId={params.replyTo || null}
      initialTitle={params.title || ''}
      initialRecipientId={params.recipientId || null}
    />
  )
}
