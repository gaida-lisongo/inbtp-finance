import { createAdminClient } from "@/lib/utils/supabase/admin";

export type DocumentRecord = {
  id: string;
  created_at: string;
  programme_id: string;
  designation: string | null;
  description: string | null;
  slug: string | null;
  entra_id: string | null;
  montant: number | null;
  caracteristique: any | null; // jsonb
  is_active: string | null;
};

export const getDocumentsForProgramme = async (programmeId: string): Promise<DocumentRecord[]> => {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("programme_id", programmeId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch documents: ${error.message}`);
  }

  return data || [];
};

export const createDocument = async (document: Omit<DocumentRecord, "id" | "created_at">): Promise<DocumentRecord> => {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("documents")
    .insert(document)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create document: ${error.message}`);
  }

  return data;
};

export const updateDocument = async (id: string, updates: Partial<Omit<DocumentRecord, "id" | "created_at">>): Promise<DocumentRecord> => {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("documents")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update document: ${error.message}`);
  }

  return data;
};

export const deleteDocument = async (id: string): Promise<void> => {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to delete document: ${error.message}`);
  }
};