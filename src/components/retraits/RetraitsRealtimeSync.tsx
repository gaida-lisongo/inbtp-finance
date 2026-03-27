"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/utils/supabase/client";

type RetraitsRealtimeSyncProps = {
  agentId: string;
};

export default function RetraitsRealtimeSync({ agentId }: RetraitsRealtimeSyncProps) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`retraits-${agentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "retraits",
          filter: `agent_id=eq.${agentId}`,
        },
        () => {
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [agentId, router]);

  return null;
}
