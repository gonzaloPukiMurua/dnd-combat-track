import { AppHeader } from "@/components/nav/AppHeader";

// S2-7 — /profile is its own authenticated subtree (not under /campaigns),
// so it mounts the global header the same way campaigns/ and combat/ do
// (S2-1). Session is enforced by src/proxy.ts.
export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      <div className="mx-auto max-w-lg px-6 py-10">{children}</div>
    </>
  );
}
