import { MarketingFooter } from "./marketing-footer";
import { MarketingNav } from "./marketing-nav";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarketingNav />
      <main>{children}</main>
      <MarketingFooter />
    </>
  );
}
