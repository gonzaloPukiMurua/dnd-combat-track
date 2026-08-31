import { AppHeader } from "@/components/nav/AppHeader";

// Fonts and dark theme come from the root layout. This adds the persistent
// global header (S2-1) above the section-specific reading-width container
// that every campaign-scoped route shares.
export default function CampaignsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      <div className="mx-auto max-w-lg px-6 py-10">{children}</div>
    </>
  );
}
