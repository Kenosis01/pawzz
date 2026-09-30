/*
 * Page directory
 * ==============
 * One folder per product surface, mirroring the PRD's information architecture.
 *
 *   pages/
 *     chat/       §9  conversation, research, writing, coding, learning
 *     cowork/     §19 agents, dashboard, permissions, universal agent
 *     design/     §29 artifact generation + the three editor workspaces
 *     projects/   §8  contextual AI workspaces spanning all three modes
 *     settings/   §38 out-of-workspace configuration
 *     onboarding/ §131 first run
 *     search/     §121 global search
 *     share/      §18 public conversation links
 *
 * Rules
 * -----
 * 1. A route path lives in exactly one folder. If a page needs a second
 *    location, it belongs in a shared group, not in a mode folder.
 * 2. Folders that render a nested nav (projects, settings) own their own
 *    Layout + section registry. Real content replaces the registry entries
 *    one at a time; the nav does not need to change.
 * 3. Pages stay free of data fetching. That belongs in a hook or store so
 *    pages can be reasoned about in isolation.
 * 4. Nothing in pages/ imports from another page folder. Cross-page needs
 *    move to components/.
 */
