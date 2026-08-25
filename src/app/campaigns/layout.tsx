// Fonts and dark theme now come from the root layout — this only keeps the
// section-specific reading-width container for campaign-scoped routes.
export default function CampaignsLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-lg px-6 py-10">{children}</div>;
}
