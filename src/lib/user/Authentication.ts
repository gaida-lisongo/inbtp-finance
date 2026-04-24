import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "../utils/supabase/admin";
import { sendMail } from "@/utils/mail";

export default class Authentication {
  private readonly secretKey = process.env.JWT_SECRET || "fallback_secret_for_dev_only";
  private readonly key = new TextEncoder().encode(this.secretKey);
  
  constructor() {}
  
  async encrypt(payload: any) {
    return await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("2h") // Le token expire après 2h
      .sign(this.key);
  }
  
  async decrypt(sessionToken: string): Promise<any> {
    const { payload } = await jwtVerify(sessionToken, this.key, {
      algorithms: ["HS256"],
    });
    return payload;
  }

  async generateOtp(email: string) {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // On chiffre l'OTP et l'email dans un JWT éphémère
    const otpSession = await this.encrypt({ otp, email });

    const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    console.log('[GENERATING OTP]', otp);
    (await cookies()).set("otp_session", otpSession, {
        expires,
        httpOnly: true, // Empêche l'accès via document.cookie
        secure  : true,   // Uniquement via HTTPS
        sameSite: "lax",
        path: "/",
    });

    const bodyHtmlMail = `
        <div style="font-family: sans-serif; text-align: center;">
            <h1>Code de vérification</h1>
            <p style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #007bff;">${otp}</p>
            <p>Ce code expire dans 5 minutes.</p>
        </div>
    `;

    await sendMail({ to: email, subject: "Votre code de connexion", html: bodyHtmlMail });
    console.log('[OTP SENT TO]', email);
    return true;
  }

  async verifyOtp(otpInput: string, emailInput: string) {
    const cookieSession = (await cookies()).get("otp_session");
    if (!cookieSession) return false;

    try {
        const payload = await this.decrypt(cookieSession.value);
        
        // On vérifie l'OTP ET que l'email correspond pour éviter les injections
        if (payload.otp === otpInput && payload.email === emailInput) {
            (await cookies()).delete("otp_session");
            return true;
        }
    } catch (e) {
        return false; // Token expiré ou corrompu
    }
    return false;
  }

  async signUserAction(formData: FormData) {
    const email = formData.get("email") as string;
    const table = formData.get("table") as string;

    const admin = createAdminClient();
    console.log("Table : ", table);
    console.log("Email : ", email);
    const { data, error } = await admin
        .from(table)
        .select('*')
        .eq('email', email)
        .single();

    if (error || !data) {
        console.log("Erreur : ", error);
        throw error;
    }
    
    const user = data;
    const expires = new Date(Date.now() + 2 * 60 * 60 * 1000); 
    const session = await this.encrypt({ user, expires });

    // 3. Créer le Cookie HTTP-only (Indétectable par le JS client, très sécurisé)
    (await cookies()).set("session", session, { 
        expires, 
        httpOnly: true, 
        secure: true, // Important puisque tu as un SSL (HTTPS)
        sameSite: "lax",
        path: "/",
    });

    return true;
  }

  async getCurrentUser(){
    const session = (await cookies()).get("session");
    if(!session){
        return null;
    }

    const data = await this.decrypt(session.value);
    return data.user;
  }
  
  async signOut() {
    (await cookies()).delete("session");
  }
}