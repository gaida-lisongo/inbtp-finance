import { redirect } from "next/navigation";
import { Metadata } from "next";

import ProfileEditor from "@/components/user-profile/ProfileEditor";
import { getCurrentAgentProfile } from "@/lib/utils/supabase/agents";

export const metadata: Metadata = {
  title: "Next.js Profile | TailAdmin - Next.js Dashboard Template",
  description:
    "This is Next.js Profile page for TailAdmin - Next.js Tailwind CSS Admin Dashboard Template",
};

type ProfilePageProps = {
  searchParams: Promise<{
    status?: string;
    message?: string;
  }>;
};

export default async function Profile({ searchParams }: ProfilePageProps) {
  const [agent, params] = await Promise.all([getCurrentAgentProfile(), searchParams]);

  if (!agent) {
    redirect("/signin?error=access_denied");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Profile</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Modifiez ici les donnees du compte courant enregistrees dans <code>public.agents</code>.
        </p>
      </div>

      <ProfileEditor agent={agent} status={params.status} message={params.message} />
    </div>
  );
}
