import { createAdminClient } from "@/lib/utils/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export type AutorisationCode = "CS" | "CE" | "CR" | "APP" | "SEC" | "T" | "J";


const supabaseBucket = process.env.SUPABASE_BUCKET;
const signedUrlExpiresInSeconds = 60 * 60;

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

const extractStoragePath = (value: string) => {
  if (!supabaseBucket || !isAbsoluteUrl(value)) return value;
  const publicSegment = `/storage/v1/object/public/${supabaseBucket}/`;
  const signSegment = `/storage/v1/object/sign/${supabaseBucket}/`;

  if (value.includes(publicSegment)) return value.split(publicSegment)[1]?.split("?")[0] ?? value;
  if (value.includes(signSegment)) return value.split(signSegment)[1]?.split("?")[0] ?? value;
  return value;
};

const resolvePhotoUrl = async (photo: string | null) => {
  if (!photo) return null;
  if (!supabaseBucket || (isAbsoluteUrl(photo) && !photo.includes(`/storage/v1/object/`))) return photo;

  try {
    const photoPath = extractStoragePath(photo);
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from(supabaseBucket)
      .createSignedUrl(photoPath, signedUrlExpiresInSeconds);
    return error || !data?.signedUrl ? null : data.signedUrl;
  } catch {
    return null;
  }
};

//GET ALL USERS
export const GET = async (request: NextRequest) => {
    try {
        const table = request.nextUrl.searchParams.get("table");
        const offset = parseInt(request.nextUrl.searchParams.get("offset") || "0");
        const limit = parseInt(request.nextUrl.searchParams.get("limit") || "100");
        
        
        if(!table){
            return NextResponse.json(
                {
                    message: "Table non fourni",
                },
                { status: 400 },
            );
        }

        const admin = createAdminClient();

        const {data, error} = await admin.from(table).select("*").range(offset, limit);

        if(error){
            console.log(error)
            return NextResponse.json(
                {
                    message: "Une erreur est survenu lors de la recuperation de l'utilisateur",
                },
                { status: 500 },
            );
        }

        return NextResponse.json({
            message: `Users - ${table} recuperes avec succes`,
            data,
            count: data.length,
        });
    } catch (error) {
        return NextResponse.json(
            {
                message: "Une erreur est survenu lors de la recuperation de l'utilisateur",
            },
            { status: 500 },
        );
    }
};

//UPDATE USER
export const PUT = async (request: NextRequest) => {
    try {
        const table = request.nextUrl.searchParams.get("table");
        const { id, payload } = await request.json();
        
        if(!table){
            return NextResponse.json(
                {
                    message: "Table non fourni",
                },
                { status: 400 },
            );
        }

        if(!id || !payload){
            return NextResponse.json(
                {
                    message: "ID et Payload non fournis",
                },
                { status: 400 },
            );
        }

        console.log("Update : ", payload)

        const admin = createAdminClient();
        const { data, error } = await admin.from(table).update(payload).eq("id", id).select("*").single();

        if(error){
            console.log(error)
            return NextResponse.json(
                {
                    message: "Une erreur est survenu lors de la mise a jour de l'utilisateur",
                },
                { status: 500 },
            );
        }

        console.log("Updated : ", data)
        
        return NextResponse.json({
            message: `User - ${table} mis a jour avec succes`,
            data: data,
        }, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            {
                message: "Une erreur est survenu lors de la recuperation de l'utilisateur",
            },
            { status: 500 },
        );
    }
};

//POST PHOTO-FORMDATA
export const POST = async (request: NextRequest) => {
    try {
        const table = request.nextUrl.searchParams.get("table");
        const id = request.nextUrl.searchParams.get("id");
        const formData = await request.formData();
        const uploadedPhoto = formData.get("photo");

        if (!uploadedPhoto || !table || !id) {
            return NextResponse.json({ message: "Paramètres manquants (table, id ou photo)" }, { status: 400 });
        }

        const admin = createAdminClient();

        if (uploadedPhoto instanceof File && uploadedPhoto.size > 0) {
            const arrayBuffer = await uploadedPhoto.arrayBuffer();
            const extension = uploadedPhoto.name.split(".").pop() || "bin";
            const photoPath = `${table}/${id}/profile-${Date.now()}.${extension}`;

            // 1. UPLOAD du fichier
            const { data: uploadData, error: uploadError } = await admin.storage
                .from(supabaseBucket!)
                .upload(photoPath, Buffer.from(arrayBuffer), { // Utilise Buffer.from pour Node.js
                    contentType: uploadedPhoto.type,
                    upsert: true,
                });

            if (uploadError) throw uploadError;

            // 2. RÉCUPÉRATION de l'URL signée (ton fameux resolve)
            // On utilise ton utilitaire resolvePhotoUrl que tu as déjà défini plus haut !
            const signedUrl = await resolvePhotoUrl(photoPath);

            // 3. (Optionnel) Mise à jour de la table en BDD directement
            // Pour que l'utilisateur ait son chemin stocké
            await admin.from(table).update({ photo: photoPath }).eq("id", id);

            return NextResponse.json({
                message: "Photo uploadée et signée avec succès",
                photoPath: photoPath, // Le chemin relatif pour la BDD
                photoUrl: signedUrl   // L'URL temporaire pour l'affichage immédiat
            });
        }
        
        return NextResponse.json({ message: "Fichier invalide" }, { status: 400 });

    } catch (error: any) {
        console.error("Erreur Upload:", error);
        return NextResponse.json({ message: error.message || "Erreur lors de l'upload" }, { status: 500 });
    }
};

//PATCH : RECUPERATION AUTORISATIONS DE L'UTILISATEUR
export const PATCH = async (request: NextRequest) => {
    try {
        const agentId = request.nextUrl.searchParams.get("agentId");

        const admin = createAdminClient();
        const { data, error } = await admin
            .from("autorisation")
            .select("designation, is_active")
            .eq("agent_id", agentId);

        if (error) throw new Error(error.message);

        return NextResponse.json({
            message: `Autorisations de l'utilisateur recuperes avec succes`,
            data: data,
        }, { status: 200 });
    } catch (error: any) {
        console.error("Erreur : ", error);
        return NextResponse.json(
            {
                message: "Une erreur est survenu lors de la recuperation des autorisations de l'utilisateur",
            },
            { status: 500 },
        );
    }
};

//DELETE: ERASE AUTORISATIONS
export const DELETE = async (request: NextRequest) => {
    try {
        const {designation, agentId} = await request.json();

        const admin = createAdminClient();
        const { data, error } = await admin
            .from("autorisation")
            .delete()
            .eq("agent_id", agentId)
            .eq("designation", designation);

        if (error) throw new Error(error.message);

        return NextResponse.json({
            message: `Autorisations de l'utilisateur effacees avec succes`,
            data: data,
        }, { status: 200 });
    } catch (error: any) {
        console.error("Erreur : ", error);
        return NextResponse.json(
            {
                message: "Une erreur est survenu lors de l'effacement des autorisations de l'utilisateur",
            },
            { status: 500 },
        );
    }
};