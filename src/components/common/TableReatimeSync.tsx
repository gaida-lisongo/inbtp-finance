"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/utils/supabase/client";

interface SchemaRealtimeSyncProps {
  tables: string[];
  delay?: number;
  onChange?: () => void;
}

export default function SchemaRealtimeSync({
  tables,
  delay = 300,
  onChange,
}: SchemaRealtimeSyncProps) {
  const router = useRouter();
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tablesKey = tables.join("|");

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`multi-table-realtime-${tablesKey}-${Date.now()}`);

    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = setTimeout(() => {
        if (onChange) {
          onChange();
          return;
        }

        router.refresh();
      }, delay);
    };

    tables.forEach((table) => {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
        },
        scheduleRefresh
      );
    });

    channel.subscribe();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      supabase.removeChannel(channel);
    };
  }, [router, tables, tablesKey, delay, onChange]);

  return null;
}
