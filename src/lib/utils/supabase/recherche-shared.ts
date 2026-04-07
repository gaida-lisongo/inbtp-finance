export type ResearchTableName = "stages" | "sujets" | "laboratoires";

export type SujetJuryMember = {
  membre: string;
  enseignant: string;
};

export type ResearchRecord = {
  id: string;
  created_at: string;
  programme_id: string | null;
  montant: number | null;
  description: unknown;
  slug: string | null;
  entra_id: string | null;
  is_active: string | null;
  jury?: unknown;
};

export const formatResearchDescription = (value: unknown) => {
  if (value == null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") {
          return item.trim();
        }

        if (item && typeof item === "object") {
          const row = item as Record<string, unknown>;
          const text = typeof row.text === "string" ? row.text.trim() : "";
          if (text) {
            return text;
          }
        }

        return "";
      })
      .filter(Boolean)
      .join("\n");
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferredKeys = ["text", "resume", "description", "message", "details"];

    for (const key of preferredKeys) {
      const candidate = record[key];
      if (typeof candidate === "string" && candidate.trim().length > 0) {
        return candidate.trim();
      }
    }
  }

  return JSON.stringify(value, null, 2);
};
