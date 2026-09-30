import { ConversationPage } from "~/screens/chat";

/**
 * `params` is a Promise in Next 15. The id is the only thing known at request
 * time — the transcript itself is client state.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  return <ConversationPage conversationId={conversationId} />;
}
