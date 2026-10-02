# Status & roadmap

An honest inventory: what works, what is a placeholder, and what is missing. If
you are an agent asked to "finish the app", start by picking an item from
[Not built](#not-built-yet) and confirming the intended behaviour with a
maintainer — the surfaces exist but their specifications are not in this
repository.

## Working

| Area | What works | Where |
| --- | --- | --- |
| Chat | send, stream, stop, run-again, inline edit-and-rerun | `use-pawzz-chat.ts`, `ConversationPage.tsx` |
| Persistence | transcripts survive reload; sidebar history, pin, rename, delete | `state/conversation.tsx`, `Sidebar.tsx` |
| Titles | model-generated names, with a first-line fallback | `api/chat/title`, `requestTitle` |
| Markdown | GFM, KaTeX maths, syntax-highlighted code with a copy control | `Markdown.tsx` |
| Widgets | model-drawn HTML/SVG in a sandbox, height fitting, export to PNG or HTML, copy code | `widget.ts`, `Widget.tsx` |
| Models | live catalogue, free-only filter, allowlist, enabled shortlist, default model | `api/models`, `ModelsSection.tsx` |
| Attachments | drag-and-drop, paste (image and long text), file picker, image thumbnails | `composer/attachments.ts`, `Composer.tsx` |
| Theming | light / dark / system, no flash, live OS changes | `theme.ts`, `layout.tsx` |
| Onboarding | name, then intent, then into the app | `screens/onboarding/` |
| Settings | General (with Appearance folded in), Memory, Models; Usage / Subscription / Agents are described placeholders | `screens/settings/` |
| Shell | resizable collapsible sidebar, profile menu, 404 | `components/layout/` |

## Stubs

These routes resolve and render, but the surface is empty. They are listed with
their routes in [Routes](./routes.md).

| Surface | Routes | Component |
| --- | --- | --- |
| Projects | `/projects`, `/projects/[projectId]`, `/projects/[projectId]/[sectionId]` | `ProjectsPage`, `ProjectSectionPage` |
| Co-work | `/cowork`, `/cowork/dashboard`, `/cowork/agents/new`, `/cowork/agents/[agentId]` | `CoworkPage` et al. |
| Design | `/design`, `/design/{document,presentation,website}/[artifactId]` | `DesignPage`, three workspace pages |
| Search | `/search` | `SearchPage` |
| Shared links | `/shared/[shareToken]` | `SharedConversationPage` |

The design workspace pages render `ArtifactWorkspaceLayout` with all three slots
empty — the frame exists, the content does not.

The `SettingsSectionPage` `agents`, `usage` and `subscription` sections are
**described placeholders** — each explains what the section is for
and states that nothing is configured. Nothing is faked: no invented numbers, no
"coming soon" buttons that do nothing.

## Partly wired

Features that exist in the UI but do not change behaviour yet. Each is a real
gap, not a bug.

| Feature | What happens now | Where |
| --- | --- | --- |
| **Incognito** | the toggle and its styling are real; the greeting changes to "You're incognito". Nothing else is affected — transcripts are still written normally. | `ChatHeader.tsx` (`lib/incognito.tsx`), which says so in its comment |
| **Effort** (`low…max`) | stored and shown in the picker; not sent to the API | `lib/model-preference.ts` |
| **Thinking** | stored and shown; not sent to the API | `lib/model-preference.ts` |
| **Web search / Memory** | rendered as always-on rows in the `+` menu; no runtime behind them | `composer/PlusMenu.tsx` |
| **Voice input** | the mic button is intentionally disabled | `composer/SendSlot.tsx` |
| **Workbench** | the component works, but no screen passes `workbenchTabs`, so it never opens | `layout/Workbench.tsx` |
| **Share Chat** | copies the `/chat/:id` URL to the clipboard; **the recipient gets a 404**, because `/shared/[shareToken]` is a stub and conversation ids are local to one browser | `layout/ChatRowMenu.tsx` |
| **Add project** | a submenu that says "No projects yet" | `layout/ChatRowMenu.tsx` |
| **`+` menu stubs** | Add to project, Skills, Connectors, Design system, Add plugins — disabled on purpose, and removed from the tab order so a keyboard user is not trapped | `composer/PlusMenu.tsx` |

Share deserves emphasis: the menu entry is labelled "Share Chat" and the
clipboard write succeeds, but the link only works for someone on the same
browser profile. That is misleading until `/shared/[shareToken]` is implemented
with server-side storage.

## Not built yet

Not started, and not stubbed either. Each is a substantial piece of work.

- **Authentication and sync.** No accounts, no server storage. Everything is
  local to a browser profile.
- **A rate limit on `/api/*`.** See [Abuse surface](./api.md#abuse-surface).
  This is the single most important item before a public deployment.
- **Global search.** `/search` is a stub; there is no index of transcripts.
- **Projects.** The section registry
  (`screens/projects/projectSections.ts`: overview, chats, files, knowledge,
  agents, design) and the layout exist; none of the sections have content.
- **Co-work / agents.** Agent creation, dashboard, and permission scoping.
- **Design artifact generation.** The three editors (document, presentation,
  website).
- **Public conversation links.** A server-side store and a read-only viewer.
- **Usage / subscription / connectors / MCP / skills / plugins.** The `+` menu
  and the settings sections name them; none have a runtime.
- **Keyboard shortcuts.** Only Enter, Shift+Enter and Escape are bound. There is
  no global shortcut and no command palette.
- **Tests.** There is no test suite. The build plus manual smoke tests are the
  current gate.

## Known issues

| Issue | Impact | Notes |
| --- | --- | --- |
| `/api/*` is unauthenticated | spending and rate-limit exposure | intended for local/preview; add a limit before public deployment |
| Share links 404 for the recipient | misleading UI | see [Partly wired](#partly-wired) |
| `next lint` is deprecated | builds still pass; breaks in Next 16 | migrate with the codemod in [Contributing](./contributing.md) |
| Free models share a rate limit | occasional upstream 429/502 | the routes degrade gracefully; titles retry once |
| ~688 MB `node_modules`, ~383 MB `.next` | repository size on disk | both gitignored |

## Adding to this document

When you implement something from [Not built yet](#not-built-yet), move it up to
[Working](#working) and delete the row. When you find a limitation, add it to
[Known issues](#known-issues) rather than leaving it in a code comment that no
one will read.