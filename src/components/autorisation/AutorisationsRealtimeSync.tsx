"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/utils/supabase/client";

export default function AutorisationsRealtimeSync() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("autorisation-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "autorisation",
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
