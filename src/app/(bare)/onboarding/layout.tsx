import { OnboardingLayout } from "~/screens/onboarding/OnboardingLayout";

/** The desktop tree wrapped both onboarding steps in this shell (spec §131). */
export default function OnboardingLayoutRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OnboardingLayout>{children}</OnboardingLayout>;
}
