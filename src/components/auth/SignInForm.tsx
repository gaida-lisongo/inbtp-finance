"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AssetImage from "@/components/common/AssetImage";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { ChevronLeftIcon } from "@/icons";

type AuthTab = "student" | "teacher" | "admin";
type Step = 1 | 2 | 3;

type SignInFormProps = {
  error?: string;
  message?: string;
  nextPath: string;
  selectedTab: AuthTab;
};

export default function SignInForm({ error: externalError, message: externalMsg, nextPath, selectedTab }: SignInFormProps) {
  const router = useRouter();
  
  // États du formulaire
  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(externalError || null);
  const [message, setMessage] = useState<string | null>(externalMsg || null);

  // Mappage des tables BDD selon l'onglet
  const tableMap = {
    student: "students",
    teacher: "agents",
    admin: "agents", // ou ta table admin
  };

  // ÉTAPE 1 : Demander l'OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/auth?email=${encodeURIComponent(email.toLowerCase())}`);
      if (!res.ok) throw new Error("Utilisateur non trouvé ou erreur serveur");
      
      setStep(2);
      setMessage("Code envoyé ! Vérifiez votre boîte mail (et vos spams).");
    } catch (err: any) {
      setError("Email introuvable. Prière de contacter la Cellule Numérique.");
    } finally {
      setLoading(false);
    }
  };

  // ÉTAPE 2 & 3 : Vérifier l'OTP et connecter
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); // Étape 3 : On affiche le loader
    setStep(3); 
    setError(null);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          otp,
          email: email.toLowerCase(),
          table: tableMap[selectedTab]
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Code incorrect");

      // Succès : Redirection via le client pour rafraîchir la session
      router.push(nextPath);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setStep(2); // Retour à la saisie si erreur
    } finally {
      setLoading(false);
    }
  };

  const heading =
    selectedTab === "teacher"
      ? "Connexion enseignant"
      : selectedTab === "admin"
        ? "Connexion administration"
        : "Connexion etudiant";
  const description =
    selectedTab === "teacher"
      ? "Utilisez votre email enseignant enregistre dans les agents et votre mot de passe."
      : selectedTab === "admin"
        ? "Utilisez votre email administrateur ou gestionnaire et votre mot de passe."
        : "Utilisez votre email institutionnel enregistre dans la base et votre mot de passe.";

  const stepTitle = step === 1 ? "Étape 1" : step === 2 ? "Étape 2" : "Étape 3";
  const stepDesc = step === 1 ? "Identification" : step === 2 ? "Vérification OTP" : "Finalisation";

  return (
    <div className="flex w-full flex-1 flex-col px-5 sm:px-8">
      {/* ... (Header identique) ... */}

      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center">
        <div className="animate-fade-up rounded-[32px] border border-white/60 bg-white/85 p-6 shadow-[0_30px_80px_rgba(39,40,38,0.10)] backdrop-blur-xl dark:border-white/10 dark:bg-[#272826]/72 sm:p-8">
                  <div className="mb-8 flex flex-col gap-5 md:mb-9 md:flex-row md:items-center md:justify-between md:gap-0">
          <div>
              <h1 className="mb-2 mt-4 text-title-sm font-semibold text-gray-900 dark:text-white sm:text-title-md">
                {heading}
              </h1>
              <p className="max-w-lg text-sm leading-7 text-gray-600 dark:text-white/70">{description}</p>
              </div>
              <div className="hidden rounded-3xl border border-[#058AC5]/15 bg-[#058AC5]/8 p-3 sm:block dark:border-white/10 dark:bg-white/5">
                <AssetImage src="elmes" alt="ELMESACAD" width={52} height={52} className="h-[52px] w-[52px] object-contain" />
              </div>
        </div>

          {/* Tabs Navigation */}
          <div className="mb-6 grid gap-3 rounded-[26px] border border-gray-200/80 bg-[#f7f7f5] p-2 dark:border-white/10 dark:bg-black/15 sm:grid-cols-3">
            {(["student", "teacher", "admin"] as AuthTab[]).map((tab) => (
               <Link 
                key={tab}
                href={`/signin?tab=${tab}${nextPath !== "/" ? `&next=${encodeURIComponent(nextPath)}` : ""}`}
                className={`flex-1 rounded-2xl px-4 py-3 text-center text-sm font-medium transition ${
                    selectedTab === tab ? "bg-[#272826] text-white shadow-theme-xs dark:bg-white dark:text-[#272826]" : "text-gray-600 dark:text-white/70"
                }`}
               >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
               </Link>
            ))}
          </div>

          {/* Stepper Visuel */}
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`rounded-2xl border border-gray-200/80 px-4 py-3 transition ${step === s ? "bg-primary-50 border-primary-200 dark:bg-white/10" : "bg-white/70 dark:bg-white/5"}`}>
                <p className={`text-xs uppercase tracking-[0.24em] ${step === s ? "text-primary-600" : "text-gray-500"}`}>Etape {s}</p>
                <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white/90">
                    {s === 1 ? "Email" : s === 2 ? "OTP" : "Accès"}
                </p>
              </div>
            ))}
          </div>

          {/* Alertes */}
          {error && <div className="mb-5 rounded-2xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>}
          {message && <div className="mb-5 rounded-2xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700">{message}</div>}

          {/* Formulaire dynamique */}
          {step === 3 && loading ? (
             <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
                <p className="text-sm font-medium text-gray-600 dark:text-white/70">Vérification de vos informations en base de données...</p>
             </div>
          ) : (
            <form onSubmit={step === 1 ? handleRequestOtp : handleVerifyOtp} className="space-y-5">
              {step === 1 && (
                <div className="animate-fade-in">
                  <Label className="mb-2 block text-sm font-semibold">Email Institutionnel</Label>
                  <Input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre.nom@inbtp.ac.cd"
                    className="h-[52px] rounded-2xl"
                  />
                  <p className="mt-2 text-xs text-gray-500">Prière de contacter la Cellule Numérique pour votre mail.</p>
                </div>
              )}

              {step === 2 && (
                <div className="animate-fade-in">
                  <Label className="mb-2 block text-sm font-semibold">Code OTP (4 chiffres)</Label>
                  <Input
                    required
                    max="4"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="0000"
                    className="h-[52px] rounded-2xl text-center text-xl tracking-[1em]"
                  />
                  <p className="mt-2 text-xs text-gray-500">Vérifiez vos spams si vous ne recevez rien.</p>
                  <button type="button" onClick={() => setStep(1)} className="mt-2 text-xs text-primary-600 underline">Changer d'email</button>
                </div>
              )}

              <Button disabled={loading} type="submit" className="h-[52px] w-full justify-center rounded-2xl font-semibold">
                {loading ? "Chargement..." : step === 1 ? "Recevoir le code" : "Vérifier et accéder"}
              </Button>
            </form>
          )}

          {/* Footer d'aide */}
          <p className="mt-6 text-center text-sm text-gray-500">
            Besoin d'aide ? <Link href="#" className="font-bold text-primary-600">Support technique</Link>
          </p>
        </div>
      </div>
    </div>
  );
}