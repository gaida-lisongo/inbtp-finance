"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient as createBrowserSupabaseClient } from "@/lib/utils/supabase/client";

export default function DashboardRealtimeRefresher() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel("dashboard-paiements")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "paiements",
        },
        () => {
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
