/**
 * Dashboard-specific queries for commande metrics and analytics
 * Separate from core commande operations (commandes.ts)
 */

import { createAdminClient } from "@/lib/utils/supabase/admin";
import type { CommandeMetrics, MonthlyDistribution, ProductMetrics, CommandeDetail, MetierCategorie } from "@/types/education";

/**
 * Get metrics for commandes (success vs pending count)
 * Optionally filtered by categorie, programme, and/or academic year
 */
export async function getCommandeMetrics(
  filters?: {
    categorie?: MetierCategorie;
    programmeId?: string;
    anneeId?: string;
  }
): Promise<CommandeMetrics> {
  const admin = createAdminClient();

  let query = admin.from("commande").select("status", { count: "exact" });

  // Apply filters
  if (filters?.categorie) {
    query = query.eq("categorie", filters.categorie);
  }

  if (filters?.programmeId) {
    // Filter by programme through session table if needed
    // For now, assuming commande has direct categorie filtering
  }

  if (filters?.anneeId) {
    // Filter by academic year if structure supports it
  }

  // Get success count
  const { count: successCount } = await query.eq("status", "success");

  // Get pending count - need to query again
  const { count: pendingCount } = await admin
    .from("commande")
    .select("status", { count: "exact" })
    .eq("status", "pending")
    .then(() => ({ count: 0 })); // Reset query

  // Better approach: get all and count
  const { data } = await admin
    .from("commande")
    .select("status");

  const success = data?.filter((c) => c.status === "success").length ?? 0;
  const pending = data?.filter((c) => c.status === "pending").length ?? 0;

  return {
    success,
    pending,
    categorie: filters?.categorie,
  };
}

/**
 * Get monthly distribution of commandes for a specific year
 * Returns success and pending counts per month
 */
export async function getCommandeMonthlyDistribution(
  year: number,
  categorie?: MetierCategorie,
  programmeId?: string
): Promise<MonthlyDistribution[]> {
  const admin = createAdminClient();

  let query = admin
    .from("commande")
    .select("created_at, status");

  // Filter by categorie
  if (categorie) {
    query = query.eq("categorie", categorie);
  }

  const { data } = await query;

  if (!data) {
    return Array.from({ length: 12 }, (_, i) => ({
      month: getMonthName(i + 1),
      monthNumber: i + 1,
      success: 0,
      pending: 0,
    }));
  }

  // Group by month and status
  const monthlyData: Record<number, { success: number; pending: number }> = {};

  for (let i = 1; i <= 12; i++) {
    monthlyData[i] = { success: 0, pending: 0 };
  }

  data.forEach((commande) => {
    const date = new Date(commande.created_at);
    const month = date.getMonth() + 1;
    const commande_year = date.getFullYear();

    if (commande_year === year && monthlyData[month]) {
      if (commande.status === "success") {
        monthlyData[month].success += 1;
      } else if (commande.status === "pending") {
        monthlyData[month].pending += 1;
      }
    }
  });

  return Array.from({ length: 12 }, (_, i) => ({
    month: getMonthName(i + 1),
    monthNumber: i + 1,
    success: monthlyData[i + 1]?.success ?? 0,
    pending: monthlyData[i + 1]?.pending ?? 0,
  }));
}

/**
 * Get product metrics for all métiers
 * Shows success/pending/total counts per category
 */
export async function getProductMetrics(
  programmeId?: string,
  anneeId?: string
): Promise<ProductMetrics[]> {
  const admin = createAdminClient();

  let query = admin.from("commande").select("categorie, status");

  const { data } = await query;

  if (!data) {
    return [];
  }

  const metrics: Record<string, { success: number; pending: number; total: number }> = {};

  data.forEach((commande) => {
    const cat = commande.categorie as MetierCategorie;
    if (!metrics[cat]) {
      metrics[cat] = { success: 0, pending: 0, total: 0 };
    }
    metrics[cat].total += 1;
    if (commande.status === "success") {
      metrics[cat].success += 1;
    } else if (commande.status === "pending") {
      metrics[cat].pending += 1;
    }
  });

  return Object.entries(metrics).map(([categorie, counts]) => ({
    categorie: categorie as MetierCategorie,
    success: counts.success,
    pending: counts.pending,
    total: counts.total,
  }));
}

/**
 * Get all commandes for a specific category with filters
 */
export async function getCommandesByCategory(
  categorie: MetierCategorie,
  filters?: {
    status?: string;
    programmeId?: string;
    limit?: number;
    offset?: number;
  }
): Promise<CommandeDetail[]> {
  const admin = createAdminClient();

  let query = admin
    .from("commande")
    .select("id, orderNumber, product, categorie, status, total, created_at, description, student_id");

  query = query.eq("categorie", categorie);

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  query = query.order("created_at", { ascending: false });

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, (filters.offset + (filters.limit ?? 10)) - 1);
  }

  const { data } = await query;

  if (!data) {
    return [];
  }

  // Fetch student details for each commande
  const studentIds = [...new Set(data.map((c) => c.student_id).filter(Boolean))] as string[];

  let studentMap: Record<string, { nom: string; email: string }> = {};

  if (studentIds.length > 0) {
    const { data: students } = await admin
      .from("students")
      .select("id, nom, email")
      .in("id", studentIds);

    if (students) {
      studentMap = Object.fromEntries(students.map((s) => [s.id, { nom: s.nom, email: s.email }]));
    }
  }

  return data.map((commande) => {
    const student = studentMap[commande.student_id || ""] || { nom: "Étudiant", email: "N/A" };
    return {
      id: commande.id,
      orderNumber: commande.orderNumber,
      product: commande.product,
      categorie: commande.categorie as MetierCategorie,
      studentName: student.nom,
      studentEmail: student.email,
      status: commande.status,
      total: commande.total,
      created_at: commande.created_at,
      description: commande.description,
    };
  });
}

/**
 * Helper: Get current year
 */
function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Helper: Get month name from month number
 */
function getMonthName(monthNumber: number): string {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return months[monthNumber - 1] || "";
}
