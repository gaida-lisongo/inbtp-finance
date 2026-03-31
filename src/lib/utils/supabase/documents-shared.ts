export type DocumentRecord = {
  id: string;
  created_at: string;
  programme_id: string;
  designation: string | null;
  description: string | null;
  slug: string | null;
  entra_id: string | null;
  montant: number | null;
  caracteristique: Record<string, unknown> | null;
  is_active: string | null;
};

export const getDocumentCategory = (document: Pick<DocumentRecord, "caracteristique">) => {
  const categorie = document.caracteristique?.categorie;
  return typeof categorie === "string" && categorie.trim().length > 0 ? categorie.trim() : "Document";
};

export const getDocumentTypeLabel = (categorie: string) => {
  const normalized = categorie.trim().toLowerCase();

  if (normalized === "relevés" || normalized === "releves") {
    return "Releve";
  }

  if (normalized === "fiche de validation") {
    return "Fiche de validation";
  }

  return categorie;
};
