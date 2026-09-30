"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ChatHeader } from "../../components/chat/ChatHeader";
import { Composer } from "../../components/chat/Composer";
import { MessageList } from "../../components/chat/MessageList";
import { Page } from "../../components/layout/Page";
import { ArrowDownIcon } from "../../components/icons/Icons";
import { usePawzzChat } from "../../lib/use-pawzz-chat";
import { useConversations, type Message } from "../../state/conversation";
import { useTheme } from "../../lib/theme";
import styles from "./chat.module.css";
import { useRouter } from "next/navigation";

/** How close to the bottom still counts as "at the bottom". */
const BOTTOM_SLOP = 32;

export function ConversationPage({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const { conversations, hydrated } = useConversations();
  const conversation = conversations[conversationId];

  // The live transcript, not the stored one: during a reply these differ, and
  // the live one is the one that is growing.
  const {
    messages,
    send,
    streaming,
    stop,
    interrupted,
    error,
    regenerate,
    regenerateFrom,
  } = usePawzzChat(conversationId);

  const { isDark } = useTheme();

  const scroller = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  /**
   * A prompt waiting to be dropped into the composer, and the counter that makes
   * each request a separate event.
   *
   * This exists because "Edit prompt" was wired to `regenerate`, so the button
   * that says *edit* was re-asking the model the same question — the one action
   * a user clicks when they do not want the answer again. Editing has to hand
   * the question back to the person.
   */
  const [prefill, setPrefill] = useState<{ text: string; id: number } | null>(null);
  const prefillSeq = useRef(0);

  // A stale id — a bookmark, a hard refresh against cleared storage — should
  // land on the empty state rather than an empty transcript under a full-size
  // prompt box.
  useEffect(() => {
    if (hydrated && !conversation) router.replace("/chat");
  }, [hydrated, conversation, router]);

  const onScroll = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_SLOP);
  }, []);

  // Follow the transcript as it grows, the way a chat should. Keyed on the last
  // message's text as well as its count, because a stream grows a message that
  // already exists — the count does not change, the content does.
  //
  // And on the last message's blocks, for the same reason one step further on. A
  // model that says "here's the chart", calls the tool, and then writes a
  // one-line takeaway leaves the tail text nearly unchanged while a
  // several-hundred-pixel frame appears *above* it. Keyed on the old pair, the
  // transcript holds still and the visual arrives off-screen.
  const last = messages[messages.length - 1];
  const tail = last?.text ?? "";
  const blocks = last?.blocks;
  const blockKey = blocks
    ? blocks.map((block) => (block.kind === "text" ? block.text.length : block.widget.id)).join("|")
    : "";
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setAtBottom(true);
  }, [messages.length, tail, blockKey]);

  // Editing rewrites the message and re-runs from there. The prompt box is not
  // involved: sending text back down to the composer moved the user to the
  // bottom of the screen and then yanked them back up to the thing being
  // changed.
  const onEdit = useCallback(
    (message: Message, text: string) => {
      regenerateFrom(message.id, text);
    },
    [regenerateFrom],
  );

  const onRetry = useCallback(() => {
    regenerate();
  }, [regenerate]);

  /**
   * Puts the prompt that produced the interrupted reply back in the box.
   *
   * The last user message, because the notice sits under the last reply and that
   * is the exchange it is about. Sending is not an option here: the user stopped
   * the answer because it was going the wrong way, and asking again without
   * changing anything is the one thing that cannot help.
   */
  const onEditPrompt = useCallback(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message?.role !== "user") continue;
      const text = message.text.trim();
      if (!text) return;
      prefillSeq.current += 1;
      setPrefill({ text, id: prefillSeq.current });
      return;
    }
  }, [messages]);

  // A widget asked a follow-up question, so it is sent as if the user had typed
  // it. It goes through `send` rather than straight into the transport, which is
  // what commits it to the transcript and asks for a title if the thread does not
  // have one yet.
  const onSendPrompt = useCallback(
    (text: string) => {
      send(text);
    },
    [send],
  );

  const jumpToBottom = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, []);

  return (
    <Page pinned>
      <ChatHeader />

      {messages.length ? (
        <div className={styles.transcript} ref={scroller} onScroll={onScroll}>
          <MessageList
            messages={messages}
            onEdit={onEdit}
            onRetry={onRetry}
            streaming={streaming}
            interrupted={interrupted}
            error={error?.message}
            onEditPrompt={onEditPrompt}
            onSendPrompt={onSendPrompt}
            isDark={isDark}
          />
          {atBottom ? null : (
            <button
              type="button"
              className={styles.jump}
              onClick={jumpToBottom}
              aria-label="Scroll to latest message"
              title="Scroll to latest message"
            >
              <ArrowDownIcon size={16} />
            </button>
          )}
        </div>
      ) : null}

      <div className={styles.footer}>
        <Composer
          hasMessages={messages.length > 0}
          streaming={streaming}
          onStop={stop}
          prefill={prefill ?? undefined}
          onSend={(text, _modelId, attachments) => {
            send(text, attachments);
          }}
        />
      </div>
    </Page>
  );
}
