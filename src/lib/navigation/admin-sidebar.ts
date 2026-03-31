import { autorisationLabels, getActiveAutorisationCodesForAgent, type AutorisationCode } from "@/lib/utils/supabase/autorisations";
import { getProgrammes } from "@/lib/utils/supabase/programmes";
import type { AuthenticatedUser } from "@/lib/utils/supabase/session";

export type SidebarMenuSubItem = {
  name: string;
  path?: string;
  subItems?: SidebarMenuSubItem[];
};

export type SidebarMenuItem = {
  name: string;
  path?: string;
  iconKey: "grid" | "folder" | "group" | "user";
  subItems?: SidebarMenuSubItem[];
};

export const getAdminSidebarMenu = async (user: AuthenticatedUser): Promise<SidebarMenuItem[]> => {
  const items: SidebarMenuItem[] = [
    {
      name: "Dashboard",
      path: "/",
      iconKey: "grid",
    },
  ];

  // Ajouter l'élément Agents pour les gestionnaires
  if (user.role === "gestionnaire") {
    items.push({
      name: "Agents",
      path: "/agents",
      iconKey: "user",
    });
  }

  if (!user.agentId) {
    return items;
  }

  const autorisationCodes = await getActiveAutorisationCodesForAgent(user.agentId);
  const programmes = await getProgrammes();
  const activeYearId = programmes.find((programme) => programme.annee_id && programme.anneeActive)?.annee_id ?? null;
  const renderMenu = (
    authorizationLabel: string,
    authorizationCode: AutorisationCode,
  ): SidebarMenuItem => {
    const years = new Map<string, SidebarMenuSubItem>();

    for (const programme of programmes) {
      if (!programme.annee_id || (activeYearId && programme.annee_id !== activeYearId)) {
        continue;
      }

      const existingYear = years.get(programme.annee_id);
      const promotionItem = {
        name: programme.designation || programme.slug || "Promotion sans designation",
        path: `/${authorizationCode.toLowerCase()}?annee=${programme.annee_id}&promotion=${programme.id}`,
      };

      if (existingYear) {
        existingYear.subItems = [...(existingYear.subItems ?? []), promotionItem];
        continue;
      }

      years.set(programme.annee_id, {
        name: programme.anneeDesignation || "Annee sans designation",
        subItems: [promotionItem],
      });
    }

    return {
      name: authorizationLabel,
      iconKey: "folder",
      subItems: Array.from(years.values()),
    };
  };

  for (const code of autorisationCodes) {
    items.push(renderMenu(autorisationLabels[code], code));
  }

  return items;
};
