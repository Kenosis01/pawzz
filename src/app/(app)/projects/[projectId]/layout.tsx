import { ProjectLayout } from "~/screens/projects/ProjectLayout";

/**
 * Nested layout, so the section nav and the project context persist while moving
 * between sections — the equivalent of react-router's nested layout route.
 */
export default async function ProjectLayoutRoute({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectLayout projectId={projectId}>{children}</ProjectLayout>;
}
