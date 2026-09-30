"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useEffect, useMemo, useState } from "react";

import { cn } from "../../lib/cn";
import type { useSidebar } from "../../lib/sidebar";
import { useConversations } from "../../state/conversation";
import {
  ChevronRightIcon,
  DotsHorizontalIcon,
  FolderOpenIcon,
  PanelLeftCloseIcon,
  PinIcon,
  PlusIcon,
} from "../icons/Icons";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { PawzzMark } from "../brand/PawzzMark";
import { ChatRowMenu, type HistoryEntry } from "./ChatRowMenu";
import { ProfileMenu } from "./ProfileMenu";
import { RenameField } from "./RenameField";
import styles from "./Sidebar.module.css";

const items = [{ to: "/projects", label: "Projects", Icon: FolderOpenIcon }];

export function Sidebar({
  width,
  collapsed,
  resizing,
  toggle,
  startResize,
  resize,
  endResize,
}: ReturnType<typeof useSidebar>) {
  const pathname = usePathname();
  const router = useRouter();
  const { conversations, setTitle, pin, removeConversation } = useConversations();

  /**
   * Whether the history list is open.
   *
   * Collapsed by choice rather than by height. A long history on a short window
   * would otherwise push the profile menu off the bottom of the rail, and the
   * toggle means the reader can hand the whole area to the list when they want to
   * go through it.
   */
  const [historyOpen, setHistoryOpen] = useState(true);

  /**
   * The chat whose three-dot menu is open, and the chat being renamed in place.
   *
   * One id each rather than a boolean: the list is 50 rows long and the menu is
   * scoped to a row, so "is a menu open" has to say *which* one. Both are cleared
   * on navigation — leaving the thread takes its menu and its half-typed rename
   * with it, and neither belongs on the next row.
   */
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);

  /**
   * The thread a delete is asking about, or null.
   *
   * The whole entry rather than its id, so the dialog can name the chat it is
   * about. A confirmation that says "this chat" while the list behind it holds
   * forty of them is asking the reader to remember which row they were on.
   */
  const [deleting, setDeleting] = useState<HistoryEntry | null>(null);

  useEffect(() => {
    setMenuFor(null);
    setRenaming(null);
  }, [pathname]);

  /**
   * The chat history, newest first.
   *
   * Recency comes from the newest message in each thread rather than from a
   * stored `updatedAt`, because there is no such field and adding one would mean
   * keeping it correct in four places that write the transcript. The last
   * message is the last thing that happened in a conversation, by definition.
   *
   * Pinned threads sort above all of that. Recency is a good default ordering
   * and a bad answer to "where is the one I care about" — a pinned thread is
   * pinned precisely so it stops being somewhere you have to look for.
   *
   * Empty threads are dropped: `ensure()` opens one before the first message
   * exists, and a list of blank "New conversation" rows is noise rather than
   * history. A thread that never got a message is one click away from existing.
   */
  const history = useMemo(() => {
    return Object.values(conversations)
      .filter((conversation) => conversation.messages.length > 0)
      .map((conversation) => {
        const last = conversation.messages[conversation.messages.length - 1];
        return {
          id: conversation.id,
          title: conversation.title || "Untitled",
          at: last?.createdAt ?? 0,
          pinned: conversation.pinned,
        };
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.at - a.at;
      })
      .slice(0, 50);
  }, [conversations]);

  /**
   * Prefix match, but on a path boundary: `/chat` is active for `/chat/abc123`
   * and not for `/chatty`. react-router's NavLink did this internally; the App
   * Router has no equivalent, so the rule is stated explicitly.
   */
  const isActive = (to: string) =>
    pathname === to || pathname.startsWith(`${to}/`);

  return (
    <nav
      className={cn(styles.sidebar, collapsed && styles.collapsed, resizing && styles.resizing)}
      style={collapsed ? undefined : { width }}
      aria-label="Primary"
      aria-hidden={collapsed}
    >
      <div className={styles.brand}>
        <PawzzMark size={36} />
        <span className={styles.brandText}>Pawzz</span>
        <button
          type="button"
          className={styles.collapseButton}
          onClick={toggle}
          aria-label="Hide sidebar"
          title="Hide sidebar"
          data-icon-trigger
        >
          <PanelLeftCloseIcon size={15} />
        </button>
      </div>

      <div className={styles.primary}>
        <Link href="/chat" className={styles.newItem} data-icon-trigger tabIndex={collapsed ? -1 : undefined}>
          <PlusIcon size={16} />
          <span className={styles.label}>New</span>
        </Link>

        {items.map(({ to, label, Icon }) => (
          <Link
            key={to}
            href={to}
            // react-router's NavLink owned the active state; the App Router has
            // no equivalent, so it is derived from the pathname here. `end` on
            // /chat matters: without it every thread would light up the row.
            aria-current={isActive(to) ? "page" : undefined}
            className={cn(styles.item, isActive(to) && styles.itemActive)}
            data-icon-trigger
            tabIndex={collapsed ? -1 : undefined}
          >
            <Icon size={16} />
            <span className={styles.label}>{label}</span>
          </Link>
        ))}
      </div>

      {/* The history scrolls on its own so a long list never pushes the profile
          menu off the bottom of the rail. `primary` above is not scrollable: it
          is two rows and cannot overflow. */}
      <div className={styles.history}>
        <div className={styles.historyHead}>
          <button
            type="button"
            className={styles.historyToggle}
            onClick={() => setHistoryOpen((open) => !open)}
            aria-expanded={historyOpen}
            aria-controls="pawzz-history"
            tabIndex={collapsed ? -1 : undefined}
          >
            <span className={styles.historyHeading}>Chats and tasks</span>
            {/* After the label, not before it. Leading the row with a chevron
                reads as a control pointing at the section, when the whole row is
                the control and the chevron is its state. */}
            <ChevronRightIcon
              size={13}
              className={cn(
                styles.historyChevron,
                historyOpen && styles.historyChevronOpen,
              )}
            />
          </button>
        </div>

        {historyOpen ? (
          history.length ? (
            <ul className={styles.historyList} id="pawzz-history">
              {history.map((entry) => {
                const href = `/chat/${entry.id}`;
                const active = pathname === href;
                const open = menuFor === entry.id;
                return (
                  <li
                    key={entry.id}
                    className={cn(
                      styles.historyRow,
                      open && styles.historyRowOpen,
                    )}
                  >
                    {renaming === entry.id ? (
                      <RenameField
                        initial={entry.title}
                        onCancel={() => setRenaming(null)}
                        onSave={(value) => {
                          setTitle(
                            entry.id,
                            value.trim().slice(0, 80) || entry.title,
                          );
                          setRenaming(null);
                        }}
                      />
                    ) : (
                      <div
                        className={cn(
                          styles.historyItem,
                          active && styles.historyItemActive,
                        )}
                      >
                        <Link
                          href={href}
                          aria-current={active ? "page" : undefined}
                          className={styles.historyLink}
                          tabIndex={collapsed ? -1 : undefined}
                        >
                          {/* A dot, not a glyph. Every row is a conversation, so an
                              icon per row says the same thing 40 times and adds a
                              shape to every line. A 6px ring is a bullet that says
                              "item" and stays quiet, and it takes its colour from
                              the row so the active one marks itself.

                              A pinned row swaps the ring for a pin, because that is
                              the one row whose position is not explained by the
                              ordering — without a mark, "why is this at the top?" is
                              unanswerable from the list alone. */}
                          {entry.pinned ? (
                            <PinIcon size={12} className={styles.historyPin} />
                          ) : (
                            <span
                              aria-hidden="true"
                              className={styles.historyDot}
                            />
                          )}
                          <span className={styles.historyTitle}>
                            {entry.title}
                          </span>
                        </Link>
                        <button
                          type="button"
                          className={styles.historyMore}
                          data-chat-menu={entry.id}
                          data-icon-trigger
                          aria-label={`Options for ${entry.title}`}
                          aria-haspopup="menu"
                          aria-expanded={open}
                          tabIndex={collapsed ? -1 : undefined}
                          onClick={(event) => {
                            // The button sits inside the row, and the row's link
                            // would otherwise take the click and navigate — which
                            // is the opposite of opening a menu on it.
                            event.preventDefault();
                            event.stopPropagation();
                            setMenuFor(open ? null : entry.id);
                          }}
                        >
                          <DotsHorizontalIcon size={16} />
                        </button>
                      </div>
                    )}

                    {open ? (
                      <ChatRowMenu
                        entry={entry}
                        onClose={() => setMenuFor(null)}
                        onRename={() => {
                          setMenuFor(null);
                          setRenaming(entry.id);
                        }}
                        onPin={() => {
                          pin(entry.id, !entry.pinned);
                          setMenuFor(null);
                        }}
                        onDelete={() => {
                          // The menu closes but the row stays where it is: the
                          // dialog is about that thread by name, and a list that
                          // reshuffles underneath the question makes the reader
                          // check twice that they are deleting the right one.
                          setMenuFor(null);
                          setDeleting(entry);
                        }}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={styles.historyEmpty}>No conversations yet</p>
          )
        ) : null}
      </div>

      <div className={styles.footer}>
        <ProfileMenu />
      </div>

      {!collapsed ? (
        <div
          className={styles.resizer}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          onPointerDown={startResize}
          onPointerMove={resize}
          onPointerUp={endResize}
          onPointerCancel={endResize}
          onDoubleClick={toggle}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Delete chat?"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            removeConversation(deleting.id);
            setDeleting(null);
            // Deleting the thread you are standing in leaves the route pointing
            // at an id that no longer exists. The conversation page redirects
            // itself out of a stale id, but it cannot know that the user just
            // chose this, and landing on a redirect is a worse answer than
            // being sent to the list they were already looking at.
            if (pathname === `/chat/${deleting.id}`) router.push("/chat");
          }}
        >
          {`Are you sure you want to delete “${deleting.title}”?`}
        </ConfirmDialog>
      ) : null}
    </nav>
  );
}

