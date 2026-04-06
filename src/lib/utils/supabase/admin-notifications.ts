import { createAdminClient } from "@/lib/utils/supabase/admin";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";

type AdminNotificationRecord = {
  id: string;
  created_at: string;
  object: string | null;
  description: string | null;
  categorie: string | null;
  status: boolean | null;
  path: string | null;
};

type CommandeNotificationFallbackRecord = {
  id: string;
  created_at: string;
  categorie: string | null;
  orderNumber: string | null;
  status: string | null;
};

export type AdminDashboardNotificationItem = {
  id: string;
  createdAt: string;
  object: string | null;
  description: string | null;
  category: string | null;
  path: string | null;
  status: boolean | null;
};

export type AdminDashboardNotificationSnapshot = {
  items: AdminDashboardNotificationItem[];
  pendingCount: number;
  totalCount: number;
};

const getAdminAgentId = async (agentId?: string) => {
  if (agentId) {
    return agentId;
  }

  const user = await getAuthenticatedUser();

  if (!user || user.activePersona !== "admin" || !user.agentId) {
    throw new Error("admin_access_denied");
  }

  return user.agentId;
};

export const getAdminDashboardNotificationSnapshot = async (agentId?: string): Promise<AdminDashboardNotificationSnapshot> => {
  await getAdminAgentId(agentId);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("notifications")
    .select("id, created_at, object, description, categorie, status, path")
    .in("categorie", ["commande_success", "commande", "stages"])
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as AdminNotificationRecord[];
  let items = rows.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    object: row.object,
    description: row.description,
    category: row.categorie,
    path: row.path,
    status: row.status,
  }));

  if (items.length === 0) {
    const { data: commandesData, error: commandesError } = await admin
      .from("commande")
      .select('id, created_at, categorie, "orderNumber", status')
      .eq("status", "success")
      .order("created_at", { ascending: false })
      .limit(20);

    if (commandesError) {
      throw new Error(commandesError.message);
    }

    const commandesRows = (commandesData ?? []) as CommandeNotificationFallbackRecord[];
    items = commandesRows.map((commande) => {
      const orderRef = commande.orderNumber?.trim() || commande.id;
      const category = commande.categorie?.trim() || "commande";

      return {
        id: commande.id,
        createdAt: commande.created_at,
        object: `Commande ${orderRef} confirmee`,
        description: `Paiement confirme pour la categorie ${category}.`,
        category: "commande_success",
        path: `/commande/order/${encodeURIComponent(orderRef)}`,
        status: false,
      } satisfies AdminDashboardNotificationItem;
    });
  }

  const pendingCount = items.filter((item) => item.status !== true).length;

  return {
    items,
    pendingCount,
    totalCount: items.length,
  };
};
