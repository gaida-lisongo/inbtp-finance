import { 
  getAutorisationLabels, 
  getActiveAutorisationCodesForAgent, 
  type AutorisationCode 
} from "@/lib/utils/supabase/autorisations";
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

  // --- LOGIQUE ENSEIGNANT ---
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

  // --- LOGIQUE ÉTUDIANT ---
  if (user.activePersona === "student") {
    const admin = createAdminClient();
    const student = await getCurrentAuthenticatedStudent();
    
    const [parcoursRes, programmesRes, anneesRes] = await Promise.all([
      admin.from("parcours").select("programme_id").eq("student_id", student.id),
      admin.from("programmes").select("id, designation, annee_id").order("designation", { ascending: true }),
      admin.from("annees").select("id, designation, active, date_debut, created_at")
        .order("date_debut", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false }),
    ]);

    const programmeIds = new Set((parcoursRes.data ?? []).map(item => item.programme_id).filter(Boolean));
    const programmes = (programmesRes.data ?? []).filter(p => programmeIds.has(p.id));
    const annees = anneesRes.data ?? [];
    
    const programmesByYear = new Map<string, SidebarMenuSubItem[]>();

    for (const programme of programmes) {
      if (!programme.annee_id) continue;
      const itemsForYear = programmesByYear.get(programme.annee_id) ?? [];
      itemsForYear.push({
        name: programme.designation || "Promotion sans designation",
        path: `/promotion/${programme.id}`,
      });
      programmesByYear.set(programme.annee_id, itemsForYear);
    }

    items.push({ name: "Parcours", path: "/parcours", iconKey: "folder" });
    items.push({ name: "Mes ressources", path: "/ressources", iconKey: "folder" });

    items.push({
      name: "Enseignement",
      iconKey: "folder",
      subItems: annees
        .filter(annee => programmesByYear.has(annee.id))
        .map(annee => ({
          name: annee.designation || "Annee sans designation",
          subItems: programmesByYear.get(annee.id) ?? [],
        })),
    });

    return items;
  }

  // --- LOGIQUE GESTIONNAIRE / ADMIN ---
  if (user.role === "gestionnaire") {
    items.push({ name: "Agents", path: "/agents", iconKey: "user" });
  }

  if (!user.agentId) return items;

  // Récupération des autorisations et des labels (via la nouvelle fonction async)
  const [autorisationCodes, allLabels, programmes] = await Promise.all([
    getActiveAutorisationCodesForAgent(user.agentId),
    getAutorisationLabels(),
    getProgrammes()
  ]);

  const activeYearId = programmes.find(p => p.annee_id && p.anneeActive)?.annee_id ?? null;

  // Boucle sur les codes d'autorisation pour construire le menu
  for (const code of autorisationCodes) {
    const label = allLabels[code] || code;
    const yearsMap = new Map<string, SidebarMenuSubItem>();

    for (const p of programmes) {
      if (!p.annee_id || (activeYearId && p.annee_id !== activeYearId)) continue;

      const promotionItem = {
        name: p.designation || p.slug || "Promotion sans designation",
        path: `/${code.toLowerCase()}?annee=${p.annee_id}&promotion=${p.id}`,
      };

      const existingYear = yearsMap.get(p.annee_id);
      if (existingYear) {
        existingYear.subItems = [...(existingYear.subItems ?? []), promotionItem];
      } else {
        yearsMap.set(p.annee_id, {
          name: p.anneeDesignation || "Annee sans designation",
          subItems: [promotionItem],
        });
      }
    }

    items.push({
      name: label,
      iconKey: "folder",
      subItems: Array.from(yearsMap.values()).sort((a, b) => (b.name || "").localeCompare(a.name || "")),
    });
  }

  return items;
};