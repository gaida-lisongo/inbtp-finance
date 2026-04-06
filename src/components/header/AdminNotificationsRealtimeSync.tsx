"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/utils/supabase/client";

export default function AdminNotificationsRealtimeSync() {
  const router = useRouter();
  const refreshTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = window.setTimeout(() => {
        router.refresh();
      }, 300);
    };

    const channel = supabase
      .channel("admin-notifications-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, scheduleRefresh)
      .subscribe();

    return () => {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }

      void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
