// src/app/api/navigation/sidebar/route.ts
import { NextResponse } from "next/server";
import { getProgrammes } from "@/lib/utils/supabase/programmes";
import { getTeacherProgrammeMenuData } from "@/lib/utils/supabase/teacher-teaching";
import { SidebarMenuItem, SidebarMenuSubItem } from "@/lib/navigation/admin-sidebar";

export async function POST(req: Request) {
  try {
    const { accountType, codes } = await req.json();

    const items: SidebarMenuItem[] = [
      { name: "Dashboard", path: "/", iconKey: "grid" },
    ];

    // --- LOGIQUE ENSEIGNANT ---
    if (accountType === "titulaire") {
      const years = await getTeacherProgrammeMenuData();
      items.push({
        name: "Enseignement",
        iconKey: "folder",
        subItems: years.map((year) => ({
          name: year.designation || "Année sans désignation",
          path: `/teaching?annee=${year.id}`,
        })),
      });
      return NextResponse.json(items);
    }

    // --- LOGIQUE GESTIONNAIRE / ADMIN ---
    if (accountType === "gestionnaire") {
      items.push({ name: "Agents", path: "/agents", iconKey: "user" });
    }

    const programmes = await getProgrammes();
    const activeYearId = programmes.find(p => p.annee_id && p.anneeActive)?.annee_id ?? null;

    for (const { code } of codes) {
      const yearsMap = new Map<string, SidebarMenuSubItem>();

      for (const p of programmes) {
        if (!p.annee_id || (activeYearId && p.annee_id !== activeYearId)) continue;

        const promotionItem = {
          name: p.designation || p.slug || "Promotion",
          path: `/${code.toLowerCase()}?annee=${p.annee_id}&promotion=${p.id}`,
        };

        const existingYear = yearsMap.get(p.annee_id);
        if (existingYear) {
          existingYear.subItems = [...(existingYear.subItems ?? []), promotionItem];
        } else {
          yearsMap.set(p.annee_id, {
            name: p.anneeDesignation || "Année",
            subItems: [promotionItem],
          });
        }
      }
      
      if (yearsMap.size > 0) {
        items.push({
          name: code, // Ou utiliser un label plus joli
          iconKey: "folder",
          subItems: Array.from(yearsMap.values()),
        });
      }
    }

    return NextResponse.json(items);
  } catch (error: any) {
    console.error("Navigation API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}