import { autorisationLabels, getActiveAutorisationCodesForAgent, type AutorisationCode } from "@/lib/utils/supabase/autorisations";
import { getProgrammes } from "@/lib/utils/supabase/programmes";
import { createAdminClient } from "@/lib/utils/supabase/admin";
import { getCurrentAuthenticatedStudent } from "@/lib/utils/supabase/commandes";
import { getTeacherProgrammeMenuData } from "@/lib/utils/supabase/teacher-teaching";
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

  if (user.activePersona === "teacher") {
    const years = await getTeacherProgrammeMenuData();

    items.push({
      name: "Enseignement",
      iconKey: "folder",
      subItems: years.map((year) => ({
        name: year.designation || "Annee sans designation",
        subItems: year.programmes.map((programme) => ({
          name: programme.designation || "Promotion sans designation",
          path: `/enseignant/promotion/${programme.id}`,
        })),
      })),
    });

    return items;
  }

  if (user.activePersona === "student") {
    const admin = createAdminClient();
    const student = await getCurrentAuthenticatedStudent();
    const [{ data: parcoursData, error: parcoursError }, { data: programmesData, error: programmesError }, { data: anneesData, error: anneesError }] =
      await Promise.all([
        admin.from("parcours").select("programme_id").eq("student_id", student.id),
        admin
          .from("programmes")
          .select("id, designation, annee_id")
          .order("designation", { ascending: true }),
        admin
          .from("annees")
          .select("id, designation, active, date_debut, created_at")
          .order("date_debut", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false }),
      ]);

    if (parcoursError) {
      throw new Error(parcoursError.message);
    }

    if (programmesError) {
      throw new Error(programmesError.message);
    }

    if (anneesError) {
      throw new Error(anneesError.message);
    }

    const programmeIds = new Set(
      ((parcoursData ?? []) as Array<{ programme_id: string | null }>).map((item) => item.programme_id).filter(Boolean),
    );
    const programmes = ((programmesData ?? []) as Array<{ id: string; designation: string | null; annee_id: string | null }>).filter((programme) =>
      programmeIds.has(programme.id),
    );
    const annees = (anneesData ?? []) as Array<{ id: string; designation: string | null; active: string | null }>;
    const programmesByYear = new Map<string, SidebarMenuSubItem[]>();

    for (const programme of programmes) {
      if (!programme.annee_id) {
        continue;
      }

      const itemsForYear = programmesByYear.get(programme.annee_id) ?? [];
      itemsForYear.push({
        name: programme.designation || "Promotion sans designation",
        path: `/promotion/${programme.id}`,
      });
      programmesByYear.set(programme.annee_id, itemsForYear);
    }

    items.push({
      name: "Parcours",
      path: "/parcours",
      iconKey: "folder",
    });

    items.push({
      name: "Mes ressources",
      path: "/ressources",
      iconKey: "folder",
    });

    items.push({
      name: "Enseignement",
      iconKey: "folder",
      subItems: annees
        .filter((annee) => programmesByYear.has(annee.id))
        .sort((left, right) => {
          const leftActive = left.active === "true" ? 1 : 0;
          const rightActive = right.active === "true" ? 1 : 0;

          if (leftActive !== rightActive) {
            return rightActive - leftActive;
          }

          return (left.designation ?? "").localeCompare(right.designation ?? "");
        })
        .map((annee) => ({
          name: annee.designation || "Annee sans designation",
          subItems: programmesByYear.get(annee.id) ?? [],
        })),
    });

    return items;
  }

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

  if (autorisationCodes.includes("CS")) {
    items.push({
      name: "Notifications",
      iconKey: "folder",
      subItems: [
        {
          name: "Demandes de stage",
          path: "/notifications/stages",
        },
      ],
    });
  }

  return items;
};
