/**
 * Project section registry. Data-only: the nav and the route table both read
 * from this, so adding a section means adding an entry here and a route.
 */
export const projectSections = [
  { id: "overview", path: "", label: "Overview" },
  { id: "chats", path: "chats", label: "Chats" },
  { id: "files", path: "files", label: "Files" },
  { id: "knowledge", path: "knowledge", label: "Knowledge" },
  { id: "agents", path: "agents", label: "Agents" },
  { id: "design", path: "design", label: "Design" },
] as const;

export type ProjectSectionId = (typeof projectSections)[number]["id"];
