import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/utils/supabase/admin";
import { SidebarMenuItem, SidebarMenuSubItem } from "@/lib/navigation/admin-sidebar";

export async function GET(request: NextRequest) {
  try {
    const studentId = request.nextUrl.searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json({ error: "studentId requis" }, { status: 400 });
    }

    const admin = createAdminClient();

    // On lance les requêtes en parallèle pour la performance
    const [parcoursRes, programmesRes, anneesRes] = await Promise.all([
      admin.from("parcours").select("programme_id").eq("student_id", studentId),
      admin.from("programmes").select("id, designation, annee_id").order("designation", { ascending: true }),
      admin.from("annees").select("id, designation, active, date_debut, created_at")
        .order("date_debut", { ascending: false })
    ]);

    if (parcoursRes.error) throw parcoursRes.error;
    if (programmesRes.error) throw programmesRes.error;
    if (anneesRes.error) throw anneesRes.error;

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

    // Construction du menu final
    const items: SidebarMenuItem[] = [
      { name: "Dashboard", path: "/", iconKey: "grid" },
      { name: "Parcours", path: "/parcours", iconKey: "folder" },
      { name: "Mes ressources", path: "/ressources", iconKey: "folder" },
      {
        name: "Enseignement",
        iconKey: "folder",
        subItems: annees
          .filter(annee => programmesByYear.has(annee.id))
          .map(annee => ({
            name: annee.designation || "Annee sans designation",
            subItems: programmesByYear.get(annee.id) ?? [],
          })),
      }
    ];

    return NextResponse.json(items);
  } catch (error: any) {
    console.error("Erreur Navigation Etudiant:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}