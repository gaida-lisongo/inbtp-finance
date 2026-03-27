import { redirect } from "next/navigation";
import type { Metadata } from "next";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import AgentsContent from "./AgentsContent";

export const metadata: Metadata = {
  title: "Agents | Dashboard Organisateur",
  description: "Gestion des agents par l'organisateur.",
};

export default async function AgentsPage() {
  const user = await getAuthenticatedUser();

  if (!user || !user.canAccessAdmin || user.role !== "gestionnaire") {
    redirect("/signin?error=access_denied");
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Gestion des Agents" />

      <div className="space-y-6">
        <ComponentCard
          title="Agents"
          desc="Gestion centralisée des agents du système."
        >
          <AgentsContent />
        </ComponentCard>
      </div>
    </div>
  );
}