import { redirect } from "next/navigation";

type ChargeRechercheSujetsPageProps = {
  searchParams: Promise<{
    annee?: string;
    promotion?: string;
  }>;
};

export default async function ChargeRechercheSujetsPage({ searchParams }: ChargeRechercheSujetsPageProps) {
  const queryParams = await searchParams;
  const query = new URLSearchParams();

  if (queryParams.annee) {
    query.set("annee", queryParams.annee);
  }

  if (queryParams.promotion) {
    query.set("promotion", queryParams.promotion);
  }

  query.set("tab", "sujets");

  redirect(`/cr?${query.toString()}`);
}
