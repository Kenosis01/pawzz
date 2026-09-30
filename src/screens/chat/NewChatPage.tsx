"use client";

import { ChatHeader } from "../../components/chat/ChatHeader";
import { Composer } from "../../components/chat/Composer";
import { Greeting } from "../../components/chat/Greeting";
import { Page } from "../../components/layout/Page";
import { stashPending } from "../../lib/chat-handoff";
import { useConversations } from "../../state/conversation";
import { useRouter } from "next/navigation";
import styles from "./chat.module.css";

/**
 * Empty state: the mark, the greeting, and the composer centred together. On
 * send it becomes a real conversation, so this view hands off to /chat/:id.
 *
 * The first prompt is not sent from here. It only reserves the six-hex id, stashes
 * the prompt and navigates; `/chat/:id` picks it up and sends. Two senders would
 * race — this screen's message and the conversation screen's — and the transcript
 * would show the prompt twice.
 */
export function NewChatPage() {
  const router = useRouter();
  const { ensure } = useConversations();

  return (
    <Page pinned>
      <ChatHeader />
      <div className={styles.dock}>
        <Greeting />
        <Composer
          onSend={(text, _modelId, attachments) => {
            const id = ensure();
            stashPending({ conversationId: id, text, attachments });
            router.push(`/chat/${id}`);
          }}
        />
      </div>
    </Page>
  );
}
