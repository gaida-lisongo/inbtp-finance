import { redirect } from "next/navigation";

type ChargeRechercheStagesPageProps = {
  searchParams: Promise<{
    annee?: string;
    promotion?: string;
  }>;
};

export default async function ChargeRechercheStagesPage({ searchParams }: ChargeRechercheStagesPageProps) {
  const queryParams = await searchParams;
  const query = new URLSearchParams();

  if (queryParams.annee) {
    query.set("annee", queryParams.annee);
  }

  if (queryParams.promotion) {
    query.set("promotion", queryParams.promotion);
  }

  query.set("tab", "stages");

  redirect(`/cr?${query.toString()}`);
}
