import { redirect } from "next/navigation";

type ChargeRechercheLaboratoirePageProps = {
  searchParams: Promise<{
    annee?: string;
    promotion?: string;
  }>;
};

export default async function ChargeRechercheLaboratoirePage({ searchParams }: ChargeRechercheLaboratoirePageProps) {
  const queryParams = await searchParams;
  const query = new URLSearchParams();

  if (queryParams.annee) {
    query.set("annee", queryParams.annee);
  }

  if (queryParams.promotion) {
    query.set("promotion", queryParams.promotion);
  }

  query.set("tab", "laboratoires");

  redirect(`/cr?${query.toString()}`);
}
