import type { ReactNode } from "react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";

// Public marketing site, set in Inter (app/layout.tsx; .hp-sans). Schools log in on their own
// subdomain; the header's "Log in" asks for that address and goes there.
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="site-home flex min-h-screen flex-1 flex-col bg-background">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
