# Routes

Every URL the app responds to, what renders, and whether it is real or a stub.
The mapping lives in `src/app`; the components live in `src/screens`.

Route groups `(app)` and `(bare)` exist only to share a layout — they never
appear in the URL.

## Pages

| URL | File | Renders | State |
| --- | --- | --- | --- |
| `/` | `src/app/page.tsx` | `redirect("/chat")` | — |
| `/chat` | `(app)/chat/page.tsx` | `NewChatPage` | **real** — empty state + composer |
| `/chat/[conversationId]` | `(app)/chat/[conversationId]/page.tsx` | `ConversationPage` | **real** |
| `/projects` | `(app)/projects/page.tsx` | `ProjectsPage` | **stub** |
| `/projects/[projectId]` | `(app)/projects/[projectId]/page.tsx` | `ProjectSectionPage` | **stub** |
| `/projects/[projectId]/[sectionId]` | `(app)/projects/[projectId]/[sectionId]/page.tsx` | `ProjectSectionPage` | **stub** |
| `/search` | `(app)/search/page.tsx` | `SearchPage` | **stub** |
| `/design` | `(app)/design/page.tsx` | `DesignPage` | **stub** |
| `/design/document/[artifactId]` | `…/design/document/[artifactId]/page.tsx` | `DocumentWorkspacePage` | **stub** (empty `ArtifactWorkspaceLayout`) |
| `/design/presentation/[artifactId]` | `…/design/presentation/[artifactId]/page.tsx` | `PresentationWorkspacePage` | **stub** |
| `/design/website/[artifactId]` | `…/design/website/[artifactId]/page.tsx` | `WebsiteWorkspacePage` | **stub** |
| `/cowork` | `(app)/cowork/page.tsx` | `CoworkPage` | **stub** |
| `/cowork/dashboard` | `(app)/cowork/dashboard/page.tsx` | `AgentDashboardPage` | **stub** |
| `/cowork/agents/new` | `(app)/cowork/agents/new/page.tsx` | `AgentCreatePage` | **stub** |
| `/cowork/agents/[agentId]` | `(app)/cowork/agents/[agentId]/page.tsx` | `AgentConversationPage` | **stub** |
| `/settings` | `(app)/settings/page.tsx` | `redirect("/settings/general")` | — |
| `/settings/general` | `(app)/settings/general/page.tsx` | `GeneralSection` | **real** |
| `/settings/appearance` | `(app)/settings/appearance/page.tsx` | `redirect("/settings/general")` | — |
| `/settings/[sectionId]` | `(app)/settings/[sectionId]/page.tsx` | `SettingsSectionPage` | mixed — see below |
| `/onboarding` | `(bare)/onboarding/page.tsx` | `WelcomePage` | **real** |
| `/onboarding/intent` | `(bare)/onboarding/intent/page.tsx` | `IntentPage` | **real** |
| `/shared/[shareToken]` | `(bare)/shared/[shareToken]/page.tsx` | `SharedConversationPage` | **stub** |
| any other | `src/app/not-found.tsx` | `NotFoundPage` | **real** |

The three `redirect()` pages are deliberate: `/` is the product, `/settings` has
no screen of its own because the sections are separate routes, and
`/settings/appearance` is a retired path kept working — Appearance folded into
General rather than 404ing old links.

### `/settings/[sectionId]`

`SettingsSectionPage` dispatches on the id against the registry in
`src/screens/settings/settingsSections.ts`. An id that is not in the registry
calls `notFound()` — a typo renders a 404, not a blank panel.

| `sectionId` | Component | State |
| --- | --- | --- |
| `general` | `GeneralSection` | **real** |
| `memory` | `MemorySection` | **real** |
| `models` | `ModelsSection` | **real** |
| `usage` | `PlaceholderSections` | described placeholder |
| `subscription` | `PlaceholderSections` | described placeholder |
| `agents` | `PlaceholderSections` | described placeholder |

Adding a settings section is two edits: one row in `settingsSections.ts`, one
entry in the `SECTIONS` map in `SettingsSectionPage.tsx`. The map is typed
`Record<SettingsSectionId, …>`, so a registry row with no component is a type
error rather than a blank panel.

## Route handlers (the API)

| URL | Method | File | Purpose |
| --- | --- | --- | --- |
| `/api/chat` | `POST` | `src/app/api/chat/route.ts` | stream a chat completion |
| `/api/chat/title` | `POST` | `src/app/api/chat/title/route.ts` | name a conversation |
| `/api/models` | `GET` | `src/app/api/models/route.ts` | the model catalogue |

Full contracts are in [API reference](./api.md).

## Layouts

| Layout | File | Wraps |
| --- | --- | --- |
| Root | `src/app/layout.tsx` | everything; loads fonts, injects the theme bootstrap |
| App shell | `src/app/(app)/layout.tsx` | `<AppShell>` — sidebar, main, workbench, and the three providers |
| Bare | `src/app/(bare)/layout.tsx` | nothing; onboarding and shared links must work without the sidebar |
| Project | `(app)/projects/[projectId]/layout.tsx` | `ProjectLayout` — section nav persists across sections |
| Settings | `(app)/settings/layout.tsx` | `SettingsLayout` — section nav |
| Onboarding | `(bare)/onboarding/layout.tsx` | `OnboardingLayout` (currently a passthrough) |

The providers (`IncognitoProvider`, `ModelCatalogueProvider`,
`ConversationProvider`) are mounted inside `AppShell`, not in the root layout, so
the bare routes do not fetch a catalogue they never read.

## Navigation & active state

The App Router has no `NavLink`, so active state is derived from `usePathname()`
in three places. Each uses a **path-boundary prefix** match, so `/chat` is active
for `/chat/abc` but not for `/chatty`:

- `Sidebar.tsx` — `isActive`
- `SettingsLayout.tsx` — exact match per section
- `ProjectLayout.tsx` — exact for the index section, prefix for the rest