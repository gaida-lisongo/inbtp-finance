export type ResearchTableName = "stages" | "sujets" | "laboratoires";

export type ResearchRecord = {
  id: string;
  created_at: string;
  programme_id: string | null;
  montant: number | null;
  description: unknown;
  slug: string | null;
  entra_id: string | null;
  is_active: string | null;
};

export const formatResearchDescription = (value: unknown) => {
  if (value == null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value, null, 2);
};
