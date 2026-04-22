"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/utils/supabase/admin";
import { getJuryById } from "@/lib/utils/supabase/jury";

export async function createJuryAction(data: any) {
  const admin = createAdminClient();
  const { data: newJury, error } = await admin
    .from("jury")
    .insert({
      designation: data.designation,
      annee_id: data.annee_id,
      president_id: data.president_id,
      secretaire_id: data.secretaire_id,
      isActivate: data.isActivate,
      password: data.password || "123456",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  
  revalidatePath("/jury");
  return await getJuryById(newJury.id);
}

export async function updateJuryAction(data: any) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("jury")
    .update({
      designation: data.designation,
      president_id: data.president_id,
      secretaire_id: data.secretaire_id,
      isActivate: data.isActivate,
      ...(data.password ? { password: data.password } : {}),
    })
    .eq("id", data.id);

  if (error) throw new Error(error.message);
  
  revalidatePath("/jury");
  return await getJuryById(data.id);
}

export async function deleteJuryAction(id: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("jury").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/jury");
  return true;
}
