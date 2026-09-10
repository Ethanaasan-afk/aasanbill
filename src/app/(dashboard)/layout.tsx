"use client";

import { useAuth } from "@/components/auth-provider";
import { DemoBanner } from "@/components/demo-banner";
import { OnboardingTour } from "@/components/onboarding-tour";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { TrialBanner } from "@/components/layout/trial-banner";
import { Button } from "@/components/ui/button";
import { LoadingBlock } from "@/components/ui/page-header";
import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, unlinked, sessionEmail, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-cloud">
        <LoadingBlock className="min-h-screen" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cloud px-4">
        <div className="max-w-md space-y-4 text-center">
          <p className="text-sm text-slate">
            {unlinked
              ? "Your account is signed in but not linked to a business yet."
              : "Your account isn’t linked yet. Ask an admin to invite you, then try again."}
          </p>
          {sessionEmail && (
            <p className="text-xs text-slate">
              Signed in as <span className="font-medium text-ink">{sessionEmail}</span>
            </p>
          )}
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
            {unlinked && (
              <Link href="/complete-setup">
                <Button type="button">Finish business setup</Button>
              </Link>
            )}
            <Button type="button" variant="secondary" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-cloud">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <DemoBanner />
        <TrialBanner />
        <main className="flex-1 px-4 py-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:px-8 md:py-8 md:pb-8">
          <div className="mx-auto max-w-7xl">
            <TopBar />
            {children}
          </div>
        </main>
      </div>
      <OnboardingTour />
    </div>
  );
}
