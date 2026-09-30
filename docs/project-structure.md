# Project structure

Every directory and every source file, with what it is for. Paths are relative to
the repository root. Files that are **stubs** render an empty surface — see
[Status](./status.md).

## Repository root

| Path | What it is |
| --- | --- |
| `src/` | all application code (see below) |
| `public/` | static assets — currently just `favicon.ico` |
| `docs/` | this documentation |
| `package.json` | scripts and dependencies; `type: "module"` |
| `bun.lock` | the lockfile; the project is installed with Bun |
| `tsconfig.json` | TypeScript config; defines the `~/*` → `./src/*` alias |
| `next.config.js` | pins `outputFileTracingRoot`; imports `src/env.js` so env validation runs at config load |
| `eslint.config.js` | ESLint flat config (Next core-web-vitals + type-checked TS rules) |
| `prettier.config.js` | Prettier; `prettier-plugin-tailwindcss` |
| `postcss.config.js` | `@tailwindcss/postcss` only |
| `next-env.d.ts` | generated; gitignored |
| `.env` | **gitignored** — your local secrets |
| `.env.example` | committed template documenting `OPENROUTER_API_KEY` |
| `llm_capabilities_guidebook.md` | long-form reference material; not imported by the app |
| `README.md` | the front door; points here |
| `.gitignore` | ignores `node_modules`, `.next`, `.env`, `*.tsbuildinfo`, `.vercel` |

### npm scripts (`package.json`)

| Script | Command | Use |
| --- | --- | --- |
| `dev` | `next dev` | local development server |
| `build` | `next build` | production build |
| `start` | `next start` | serve a completed build |
| `preview` | `next build && next start` | build and serve in one step |
| `lint` | `next lint` | ESLint (deprecated shim; see Contributing) |
| `lint:fix` | `next lint --fix` | ESLint with fixes |
| `typecheck` | `tsc --noEmit` | types only |
| `check` | `next lint && tsc --noEmit` | both gates |
| `format:check` / `format:write` | `prettier …` | formatting |

## `src/` top level

| Path | Responsibility |
| --- | --- |
| `src/app/` | routing — URL → screen, plus route handlers |
| `src/components/` | reusable UI, grouped by domain |
| `src/lib/` | hooks and pure logic; JSX appears only in context providers |
| `src/screens/` | one page-level component per product surface |
| `src/state/` | the conversation store (`ConversationProvider`) |
| `src/styles/` | `global.css`, `tokens.css`, `fonts.css` |
| `src/env.js` | the environment-variable contract (runtime-validated with zod) |

## `src/app/` — routes

Route groups in parentheses do not appear in the URL.

```
src/app/
├── layout.tsx                 root layout: fonts, theme bootstrap script, metadata
├── page.tsx                   "/" → redirect("/chat")
├── not-found.tsx              404 → NotFoundPage
├── (app)/                     everything inside the app shell
│   ├── layout.tsx             wraps children in <AppShell>
│   ├── chat/
│   │   ├── page.tsx           "/chat"           → NewChatPage
│   │   └── [conversationId]/page.tsx  "/chat/:id" → ConversationPage
│   ├── cowork/                Co-work surfaces            [screens are stubs]
│   │   ├── page.tsx, dashboard/page.tsx,
│   │   ├── agents/new/page.tsx, agents/[agentId]/page.tsx
│   ├── design/                artifact workspaces         [screens are stubs]
│   │   ├── page.tsx
│   │   ├── document/[artifactId]/page.tsx
│   │   ├── presentation/[artifactId]/page.tsx
│   │   └── website/[artifactId]/page.tsx
│   ├── projects/              project workspaces          [screens are stubs]
│   │   ├── page.tsx
│   │   └── [projectId]/
│   │       ├── layout.tsx     ProjectLayout — persistent section nav
│   │       ├── page.tsx       index section
│   │       └── [sectionId]/page.tsx
│   ├── search/page.tsx        global search               [stub]
│   └── settings/
│       ├── layout.tsx         SettingsLayout — section nav
│       ├── page.tsx           "/settings" → redirect("/settings/models")
│       ├── general/page.tsx   → AccountPage (deliberately blank)
│       ├── appearance/page.tsx → AppearancePage (real)
│       └── [sectionId]/page.tsx → SettingsSectionPage (dispatches 8 sections)
├── (bare)/                    outside the app shell
│   ├── layout.tsx             renders children bare
│   ├── onboarding/
│   │   ├── layout.tsx, page.tsx (WelcomePage), intent/page.tsx (IntentPage)
│   └── shared/[shareToken]/page.tsx → SharedConversationPage   [stub]
└── api/
    ├── chat/route.ts          POST — streams a completion
    ├── chat/title/route.ts    POST — names a conversation
    └── models/
        ├── route.ts           GET  — the catalogue
        └── catalogue.ts       the cached fetch + the model allowlist (not a route)
```

See [Routes](./routes.md) for the full URL table including every HTTP verb.

## `src/lib/` — hooks and logic

| File | Exports | Responsibility |
| --- | --- | --- |
| `models.ts` | `Model`, `Modality`, `AUTO`, `AUTO_DESCRIPTION`, `isAuto`, `isFreeModel` | the model shape; the Auto routing entry; the free-only predicate |
| `model-catalogue.ts` | `OpenRouterModel`, `toModel`, `normaliseCatalog`, `providerOf` | maps OpenRouter's `/models` payload onto `Model` |
| `model-catalogue-context.tsx` | `ModelCatalogueProvider`, `useModelCatalogue` | fetches `/api/models`; holds the enabled shortlist |
| `model-preference.ts` | `useModelPreference`, `EFFORTS`, `EffortId`, `DEFAULT_EFFORT` | default model id, effort level, thinking toggle |
| `use-pawzz-chat.ts` | `usePawzzChat` | the bridge between the AI SDK and the store |
| `chat-messages.ts` | `buildUserParts`, `toUIMessages`, `fromUIMessages`, `uiMessageText` | translates between store `Message` and SDK `UIMessage` |
| `chat-handoff.ts` | `stashPending`, `takePending`, `Pending` | carries the first prompt across the `/chat` → `/chat/:id` navigation |
| `widget.ts` | `WIDGET_TOOL`, `buildWidgetDocument`, `readHostTokens`, `MessageWidget`, `WIDGET_MAX_HEIGHT`, `WIDGET_MIN_HEIGHT` | builds the sandboxed widget document |
| `widget-tools.ts` | `showWidget`, `chatTools`, `WIDGET_SYSTEM_PROMPT` | the tool contract and the model's system prompt |
| `theme.ts` | `useTheme`, `Theme` | theme preference; mirrors the layout bootstrap |
| `incognito.tsx` | `IncognitoProvider`, `useIncognito` | the incognito flag |
| `sidebar.ts` | `useSidebar`, `SIDEBAR_MIN/MAX/DEFAULT` | sidebar width, collapse, drag-to-resize |
| `greeting.ts` | `getName`, `setName`, `greetFor` | display name and the time-of-day greeting |
| `placeholder.ts` | `placeholderFor` | the prompt box's placeholder, derived from state |
| `time.ts` | `timeAgo` | relative timestamps |
| `cn.ts` | `cn` | joins class names |
| `placeholder.ts` | — | (above) |

## `src/state/`

| File | Responsibility |
| --- | --- |
| `conversation.tsx` | `ConversationProvider`, `useConversations`, and the `Message` / `Conversation` / `MessageBlock` types. Owns the transcript between turns and persists it. |

## `src/components/`

| Directory | Files | What they are |
| --- | --- | --- |
| `chat/` | `Composer.tsx`, `MessageList.tsx`, `Markdown.tsx`, `Widget.tsx`, `ChatHeader.tsx`, `Greeting.tsx` | the conversation surface |
| `chat/composer/` | `attachments.ts`, `AttachmentTray.tsx`, `ModelPicker.tsx`, `PlusMenu.tsx`, `SendSlot.tsx` | the controls around the prompt box |
| `layout/` | `AppShell.tsx`, `Sidebar.tsx`, `Workbench.tsx`, `Page.tsx`, `ProfileMenu.tsx`, `ChatRowMenu.tsx`, `RenameField.tsx` | the persistent shell |
| `ui/` | `ConfirmDialog.tsx`, `SquishSwitch.tsx` | generic controls |
| `icons/` | `Icons.tsx` | the whole icon set (Lucide geometry, animated in CSS) |
| `brand/` | `PawzzMark.tsx` | the logo mark |
| `design/` | `ArtifactWorkspaceLayout.tsx` | three-region editor frame for the design workspaces |

Each component has a sibling `*.module.css`. See
[Design system](./design-system.md) for the tokens those modules consume.

## `src/screens/` — page-level components

| Folder | Real screens | Stubs |
| --- | --- | --- |
| `chat/` | `NewChatPage`, `ConversationPage` | — |
| `settings/` | `SettingsLayout`, `SettingsSectionPage`, `AppearancePage`, `AccountPage`, and `sections/{ModelsSection, PrivacySection, ShortcutsSection, AboutSection, PlaceholderSections}` | `general` is intentionally blank |
| `onboarding/` | `OnboardingLayout`, `WelcomePage`, `IntentPage` | — |
| `projects/` | `ProjectLayout` | `ProjectsPage`, `ProjectSectionPage` |
| `design/` | — | `DesignPage`, `DocumentWorkspacePage`, `PresentationWorkspacePage`, `WebsiteWorkspacePage` |
| `cowork/` | — | `CoworkPage`, `AgentDashboardPage`, `AgentConversationPage`, `AgentCreatePage` |
| `search/` | — | `SearchPage` |
| `share/` | — | `SharedConversationPage` |
| `screens/` | `NotFoundPage` | — |
| `screens/README.md` | — | documents the original "one folder per surface" convention |

## `src/styles/`

| File | Contents |
| --- | --- |
| `global.css` | element resets, focus and selection styling, overlay scrollbars, `prefers-reduced-motion` handling. Imports the other two. |
| `tokens.css` | every design token, light (`:root`) and dark (`.dark`). The single source of colour, type, spacing, radius, motion, layout and depth values. |
| `fonts.css` | a note explaining that no webfont files are bundled; faces come from `next/font`. |