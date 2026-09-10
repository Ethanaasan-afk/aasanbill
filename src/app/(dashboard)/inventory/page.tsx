"use client";

import { Suspense, useEffect } from "react";
import { LoadingBlock } from "@/components/ui/page-header";
import { useBusinessType } from "@/hooks/use-business-type";
import { redirect } from "next/navigation";
import InventoryPageClient from "./inventory-client";

function HotelGuard({ children }: { children: React.ReactNode }) {
  const { isHotel, isLoading } = useBusinessType();
  useEffect(() => {
    if (!isLoading && isHotel) redirect("/bookings");
  }, [isHotel, isLoading]);
  if (isLoading || isHotel) return <LoadingBlock />;
  return children;
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <HotelGuard>
        <InventoryPageClient />
      </HotelGuard>
    </Suspense>
  );
}
