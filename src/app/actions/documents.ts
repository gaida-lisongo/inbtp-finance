"use server";

import { revalidatePath } from "next/cache";
import { getDocumentsForProgramme, createDocument, updateDocument, deleteDocument } from "@/lib/utils/supabase/documents";

export async function getDocumentsAction(programmeId: string) {
  try {
    return await getDocumentsForProgramme(programmeId);
  } catch (error) {
    console.error("Error fetching documents:", error);
    throw new Error("Failed to fetch documents");
  }
}

export async function createDocumentAction(programmeId: string, formData: FormData) {
  try {
    const documentData = {
      programme_id: programmeId,
      designation: formData.get("designation") as string,
      description: formData.get("description") as string,
      montant: parseFloat(formData.get("montant") as string) || null,
      caracteristique: { categorie: formData.get("categorie") as string },
      is_active: formData.get("is_active") as string,
    };

    const newDocument = await createDocument(documentData);
    revalidatePath("/sec");
    return newDocument;
  } catch (error) {
    console.error("Error creating document:", error);
    throw new Error("Failed to create document");
  }
}

export async function updateDocumentAction(id: string, programmeId: string, formData: FormData) {
  try {
    const updates = {
      programme_id: programmeId,
      designation: formData.get("designation") as string,
      description: formData.get("description") as string,
      montant: parseFloat(formData.get("montant") as string) || null,
      caracteristique: { categorie: formData.get("categorie") as string },
      is_active: formData.get("is_active") as string,
    };

    const updatedDocument = await updateDocument(id, updates);
    revalidatePath("/sec");
    return updatedDocument;
  } catch (error) {
    console.error("Error updating document:", error);
    throw new Error("Failed to update document");
  }
}

export async function deleteDocumentAction(id: string) {
  try {
    await deleteDocument(id);
    revalidatePath("/sec");
  } catch (error) {
    console.error("Error deleting document:", error);
    throw new Error("Failed to delete document");
  }
}