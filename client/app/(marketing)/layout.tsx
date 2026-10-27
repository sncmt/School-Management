import type { ReactNode } from "react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";

// Public marketing site. Schools log in on their own subdomain and the
// platform admin on admin.<domain>, so there are no login links here.
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="site-home flex min-h-screen flex-1 flex-col bg-background">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
