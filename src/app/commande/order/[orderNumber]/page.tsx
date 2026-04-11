import { redirect } from "next/navigation";

import { getCommandePath, type CommandeCategory } from "@/lib/utils/supabase/commandes";
import { createAdminClient } from "@/lib/utils/supabase/admin";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";

type OrderSearchPageProps = {
  params: Promise<{
    orderNumber: string;
  }>;
};

const COMMANDE_CATEGORIES: CommandeCategory[] = ["documents", "session", "stages", "sujets", "laboratoire"];

const isCommandeCategory = (value: string | null): value is CommandeCategory => {
  if (!value) {
    return false;
  }

  return COMMANDE_CATEGORIES.includes(value as CommandeCategory);
};

export default async function OrderSearchPage({ params }: OrderSearchPageProps) {
  const { orderNumber } = await params;
  const normalizedOrderNumber = orderNumber.trim();
  const currentUser = await getAuthenticatedUser();

  if (!currentUser || !currentUser.canAccessAdmin) {
    redirect("/signin?error=access_denied");
  }

  if (!normalizedOrderNumber) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10 dark:bg-gray-950">
        <div className="w-full max-w-xl rounded-3xl border border-error-200 bg-white p-8 shadow-theme-sm dark:border-error-500/30 dark:bg-white/[0.03]">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white/90">Order number invalide</h1>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">Saisissez un orderNumber non vide depuis la barre de recherche.</p>
        </div>
      </main>
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("commande")
    .select('id, categorie, product')
    .eq("orderNumber", normalizedOrderNumber)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const commande = data?.[0];
  console.log("Commande search result:", { data, error });
  const commandeId = typeof commande?.id === "string" ? commande.id : null;
  const category = commande?.categorie ?? null;
  const productId = commande?.product ?? null;

  if (commandeId) {
    redirect(`/commandes/${encodeURIComponent(commandeId)}`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10 dark:bg-gray-950">
      <div className="w-full max-w-xl rounded-3xl border border-error-200 bg-white p-8 shadow-theme-sm dark:border-error-500/30 dark:bg-white/[0.03]">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white/90">Commande introuvable</h1>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
          Aucune commande exploitable n&apos;a ete trouvee pour l&apos;orderNumber <span className="font-medium">{normalizedOrderNumber}</span>.
        </p>
      </div>
    </main>
  );
}
