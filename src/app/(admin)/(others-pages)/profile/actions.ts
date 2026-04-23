// "use server";

// import { redirect, unstable_rethrow } from "next/navigation";

// import { updateCurrentAgentProfile } from "@/lib/utils/supabase/agents";

// // export async function updateProfileAction(formData: FormData) {
// //   try {
// //     await updateCurrentAgentProfile(formData);
// //   } catch (error) {
// //     console.log("error", error);
// //     const message = error instanceof Error ? error.message : "profile_update_failed";
// //     redirect(`/profile?status=error&message=${encodeURIComponent(message)}`);
// //   }
// // }
// export async function updateProfileAction(formData: FormData) {
//   try {
//     // 1. Mise à jour dans la base de données via Supabase Admin
//     const updatedAgent = await updateCurrentAgentProfile(formData);

//     // 2. Mise à jour de la session (Cookie) - AUTORISÉ ICI car c'est une Server Action
//     if (updatedAgent) {
//       await auth.setCurrentUser(updatedAgent); 
//     }

//     // 3. Redirection en cas de succès
//     redirect("/profile?status=success");
    
//   } catch (error) {
//     console.log("error", error);
//     const message = error instanceof Error ? error.message : "profile_update_failed";
//     redirect(`/profile?status=error&message=${encodeURIComponent(message)}`);
//   }
// }

// actions.ts
"use server";

import { updateCurrentAgentProfile } from "@/lib/utils/supabase/agents";
import Authentication from "@/lib/user/Authentication";

const auth = new Authentication();

export async function updateProfileAction(formData: FormData) {
  try {
    // 1. Mise à jour dans la base de données via Supabase Admin
    const updatedAgent = await updateCurrentAgentProfile(formData);

    // 2. Mise à jour de la session (Cookie) - AUTORISÉ ICI car c'est une Server Action
    return {
      success: true,
      user: updatedAgent
    }
    
  } catch (error) {
    console.log("error", error);
    const message = error instanceof Error ? error.message : "profile_update_failed";
    return {
      success: false,
      error: message
    };
  }
}