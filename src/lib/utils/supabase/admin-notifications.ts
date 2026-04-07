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

type GetAdminNotificationsInput = {
  agentId?: string;
  limit?: number;
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

export const getAdminNotifications = async ({
  agentId,
  limit = 30,
}: GetAdminNotificationsInput = {}): Promise<AdminDashboardNotificationItem[]> => {
  await getAdminAgentId(agentId);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("notifications")
    .select("id, created_at, object, description, categorie, status, path")
    .in("categorie", ["commande_success", "commande", "stages"])
    .order("created_at", { ascending: false })
    .limit(limit);

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

  const stageNotificationIds = items
    .filter((item) => item.category === "stages")
    .map((item) => item.id);
  const subjectNotificationIds = items
    .filter((item) => item.category === "sujets")
    .map((item) => item.id);

  if (stageNotificationIds.length > 0) {
    const { data: stageRows, error: stageRowsError } = await admin
      .from("notifications_stage")
      .select("id, notification_id")
      .in("notification_id", stageNotificationIds);

    if (stageRowsError) {
      throw new Error(stageRowsError.message);
    }

    const stageByNotificationId = new Map(
      ((stageRows ?? []) as Array<{ id: number; notification_id: string | null }>)
        .filter((row) => typeof row.notification_id === "string" && row.notification_id.length > 0)
        .map((row) => [row.notification_id as string, row.id] as const),
    );

    items = items.map((item) =>
      item.category === "stages" && stageByNotificationId.has(item.id)
        ? { ...item, path: `/notifications/stages/${stageByNotificationId.get(item.id)}` }
        : item,
    );
  }

  if (subjectNotificationIds.length > 0) {
    const { data: subjectRows, error: subjectRowsError } = await admin
      .from("notifications_sujet")
      .select("id, notification_id")
      .in("notification_id", subjectNotificationIds);

    if (subjectRowsError) {
      throw new Error(subjectRowsError.message);
    }

    const subjectByNotificationId = new Map(
      ((subjectRows ?? []) as Array<{ id: string; notification_id: string | null }>)
        .filter((row) => typeof row.notification_id === "string" && row.notification_id.length > 0)
        .map((row) => [row.notification_id as string, row.id] as const),
    );

    items = items.map((item) =>
      item.category === "sujets" && subjectByNotificationId.has(item.id)
        ? { ...item, path: `/notifications/sujets/${subjectByNotificationId.get(item.id)}` }
        : item,
    );
  }

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

  return items;
};

export const getAdminDashboardNotificationSnapshot = async (agentId?: string): Promise<AdminDashboardNotificationSnapshot> => {
  const items = await getAdminNotifications({ agentId, limit: 30 });
  const pendingCount = items.filter((item) => item.status !== true).length;

  return {
    items,
    pendingCount,
    totalCount: items.length,
  };
};
