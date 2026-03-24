import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { getCurrentAuthProfile } from "@/lib/utils/supabase/auth";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Mon profil | Gestion Finance Ecole",
  description: "Informations essentielles de l'utilisateur connecte",
};

const getDisplayName = (user: NonNullable<Awaited<ReturnType<typeof getCurrentAuthProfile>>["user"]>) => {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;

  const fullName = metadata?.full_name;
  const name = metadata?.name;

  if (typeof fullName === "string" && fullName.trim()) {
    return fullName;
  }

  if (typeof name === "string" && name.trim()) {
    return name;
  }

  if (user.email) {
    return user.email;
  }

  return "Utilisateur connecte";
};

const getProfileRows = (user: NonNullable<Awaited<ReturnType<typeof getCurrentAuthProfile>>["user"]>) => {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const customClaims =
    typeof metadata?.custom_claims === "object" && metadata.custom_claims !== null
      ? (metadata.custom_claims as Record<string, unknown>)
      : null;

  return [
    { label: "Email", value: user.email ?? "Non renseigne" },
    {
      label: "Nom complet",
      value:
        typeof metadata?.full_name === "string" && metadata.full_name.trim()
          ? metadata.full_name
          : user.email ?? "Non renseigne",
    },
    {
      label: "Nom d'utilisateur",
      value:
        typeof metadata?.preferred_username === "string"
          ? metadata.preferred_username
          : "Non renseigne",
    },
    {
      label: "Provider",
      value: typeof user.app_metadata?.provider === "string" ? user.app_metadata.provider : "azure",
    },
    {
      label: "Tenant Azure",
      value: typeof customClaims?.tid === "string" ? customClaims.tid : "Non renseigne",
    },
  ];
};

export default async function Profile() {
  const { user } = await getCurrentAuthProfile();
  console.info("[Profile Page] Auth profile data", {
    userId: user?.id ?? null,
    email: user?.email ?? null,
    provider: user?.app_metadata?.provider ?? null,
  });

  if (!user) {
    return null;
  }

  const displayName = getDisplayName(user);
  const profileRows = getProfileRows(user);

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Mon profil" />

      <ComponentCard
        title="Informations personnelles"
        desc="Resume essentiel du compte connecte."
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex h-18 w-18 items-center justify-center rounded-2xl bg-brand-500 text-2xl font-semibold text-white">
            {displayName.charAt(0).toUpperCase()}
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {displayName}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {user.email ?? "Adresse email indisponible"}
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Identifiant: {user.id}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {profileRows.map((row) => (
            <div key={row.label}>
              <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">{row.label}</p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {row.value}
              </p>
            </div>
          ))}
        </div>
      </ComponentCard>
    </div>
  );
}
