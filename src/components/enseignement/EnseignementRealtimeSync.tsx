"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/utils/supabase/client";

export default function EnseignementRealtimeSync() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("enseignement-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "semestres" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "unites" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "matieres" }, () => router.refresh())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
