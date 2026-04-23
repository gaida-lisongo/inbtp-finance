import Authentication from "@/lib/user/Authentication";
import { NextRequest, NextResponse } from "next/server";

const auth = new Authentication();

// 1. GÉNÉRER LE TOKEN / OTP (GET)
// Usage: /api/auth?email=test@example.com
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "Email requis" }, { status: 400 });

  try {
    await auth.generateOtp(email);
    return NextResponse.json({ message: "OTP envoyé par email" });
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de l'envoi" }, { status: 500 });
  }
}

// 2. VÉRIFIER LE TOKEN / LOGIN (POST)
export async function POST(request: NextRequest) {
  try {
    const { otp, email, table, role } = await request.json();
    
    const isValid = await auth.verifyOtp(otp, email);
    if (!isValid) return NextResponse.json({ error: "OTP invalide ou expiré" }, { status: 401 });

    // Création de la session après vérification OTP
    // On simule ici un FormData pour réutiliser ta méthode signUserAction
    const formData = new FormData();
    formData.append("email", email);
    formData.append("table", table);
    formData.append("role", role);

    await auth.signUserAction(formData);

    return NextResponse.json({ success: true, message: "Connexion réussie" });
  } catch (error) {
    return NextResponse.json({ error: "Échec de l'authentification" }, { status: 500 });
  }
}

// 5. DÉCONNEXION (DELETE)
export async function DELETE() {
  await auth.signOut();
  return NextResponse.json({ message: "Déconnecté" });
}