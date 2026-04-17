import Link from "next/link";

import { signUpAdminAction, signUpStudentAction, signUpTeacherAction } from "@/app/actions/auth";
import AssetImage from "@/components/common/AssetImage";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { ChevronLeftIcon } from "@/icons";

type SignUpTab = "student" | "teacher" | "admin";

type SignUpFormProps = {
  error?: string;
  nextPath: string;
  selectedTab: SignUpTab;
};

const getErrorMessage = (error?: string) => {
  switch (error) {
    case "missing_signup_fields":
      return "Tous les champs du formulaire sont obligatoires.";
    case "password_too_short":
      return "Le mot de passe doit contenir au moins 6 caracteres.";
    case "password_mismatch":
      return "Les mots de passe ne correspondent pas.";
    case "student_not_found":
      return "Cet email n'existe pas encore dans la liste etudiante importee.";
    case "student_already_registered":
      return "Cet etudiant possede deja un compte. Utilisez plutot la connexion.";
    case "student_already_linked":
      return "Ce profil etudiant est deja rattache a un autre compte.";
    case "student_email_conflict":
      return "Plusieurs etudiants portent le meme email. Corrigez d'abord les donnees.";
    case "teacher_not_found":
      return "Cet email ne correspond a aucun enseignant titulaire enregistre.";
    case "teacher_already_registered":
      return "Cet enseignant possede deja un compte. Utilisez plutot la connexion.";
    case "teacher_already_linked":
      return "Ce profil enseignant est deja rattache a un autre compte.";
    case "teacher_email_conflict":
      return "Plusieurs agents portent le meme email. Corrigez d'abord les donnees.";
    case "admin_not_found":
      return "Cet email ne correspond a aucun administrateur/gestionnaire pre-enregistre.";
    case "admin_already_registered":
      return "Cet administrateur possede deja un compte. Utilisez plutot la connexion.";
    case "admin_already_linked":
      return "Ce profil administrateur est deja rattache a un autre compte.";
    case "User already registered":
      return "Un compte Supabase existe deja pour cet email.";
    default:
      return error;
  }
};

const tabClassName = (isActive: boolean) =>
  `flex-1 rounded-2xl px-4 py-3 text-center text-sm font-medium transition ${
    isActive
      ? "bg-[#272826] text-white shadow-theme-xs dark:bg-white dark:text-[#272826]"
      : "text-gray-600 hover:bg-white dark:text-white/70 dark:hover:bg-white/8"
  }`;

const getTabHref = (tab: SignUpTab, nextPath: string) =>
  `/signup?tab=${tab}${nextPath !== "/" ? `&next=${encodeURIComponent(nextPath)}` : ""}`;

export default function SignUpForm({ error, nextPath, selectedTab }: SignUpFormProps) {
  const signInHref = `/signin?tab=${selectedTab}${nextPath !== "/" ? `&next=${encodeURIComponent(nextPath)}` : ""}`;
  const formAction =
    selectedTab === "teacher"
      ? signUpTeacherAction
      : selectedTab === "admin"
        ? signUpAdminAction
        : signUpStudentAction;
  const title =
    selectedTab === "teacher"
      ? "Creer mon acces enseignant"
      : selectedTab === "admin"
        ? "Creer mon acces administrateur"
        : "Creer mon acces etudiant";
  const description =
    selectedTab === "teacher"
      ? "Le compte est autorise si votre email existe deja dans la table agents avec le role titulaire."
      : selectedTab === "admin"
        ? "Le compte est autorise si votre email existe deja dans la table agents avec le role organisateur ou gestionnaire."
        : "Le compte est autorise si votre email existe deja dans la table students.";

  return (
    <div className="flex w-full flex-1 flex-col justify-center px-5 py-8 sm:px-8 lg:w-1/2 lg:px-10 xl:px-14">
      <div className="mx-auto mb-5 w-full max-w-xl animate-fade-up">
        <Link
          href={signInHref}
          className="inline-flex items-center text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white/90"
        >
          <ChevronLeftIcon />
          Retour a la connexion
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center">
        <div className="animate-fade-up rounded-[32px] border border-white/60 bg-white/85 p-6 shadow-[0_30px_80px_rgba(39,40,38,0.10)] backdrop-blur-xl dark:border-white/10 dark:bg-[#272826]/72 sm:p-8 [animation-delay:120ms]">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <div className="mb-4 inline-flex items-center gap-3 rounded-full border border-[#058AC5]/15 bg-[#058AC5]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#046b99] dark:border-[#058AC5]/15 dark:bg-[#058AC5]/12 dark:text-[#8ed8f1]">
                <AssetImage src="minLogo" alt="INBTP" width={18} height={18} className="h-[18px] w-[18px]" />
                Activation d'acces
              </div>
              <h1 className="mb-2 text-title-sm font-semibold text-gray-900 dark:text-white sm:text-title-md">{title}</h1>
              <p className="max-w-lg text-sm leading-7 text-gray-600 dark:text-white/70">{description}</p>
            </div>
            <div className="hidden rounded-3xl border border-[#f7a73d]/15 bg-[#f7a73d]/8 p-3 sm:block dark:border-white/10 dark:bg-white/5">
              <AssetImage src="elmes" alt="ELMESACAD" width={52} height={52} className="h-[52px] w-[52px] object-contain" />
            </div>
          </div>

          <div className="mb-6 grid gap-3 rounded-[26px] border border-gray-200/80 bg-[#f7f7f5] p-2 dark:border-white/10 dark:bg-black/15 sm:grid-cols-3">
            <Link href={getTabHref("student", nextPath)} className={tabClassName(selectedTab === "student")}>
              Etudiant
            </Link>
            <Link href={getTabHref("teacher", nextPath)} className={tabClassName(selectedTab === "teacher")}>
              Enseignant
            </Link>
            <Link href={getTabHref("admin", nextPath)} className={tabClassName(selectedTab === "admin")}>
              Admin
            </Link>
          </div>

          {error ? (
            <div className="mb-5 rounded-2xl border border-error-200 bg-error-50 px-4 py-3 text-sm leading-6 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-200">
              {getErrorMessage(error)}
            </div>
          ) : null}

          <form action={formAction} className="space-y-5">
            <input type="hidden" name="next" value={nextPath} />

            <div>
              <Label htmlFor={`signup-${selectedTab}-email`} className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/80">
                Email<span className="text-error-500">*</span>
              </Label>
              <Input
                id={`signup-${selectedTab}-email`}
                name="email"
                type="email"
                placeholder="prenom.nom@inbtp.ac.cd"
                className="h-[52px] rounded-2xl border-gray-200 bg-white/80 dark:border-white/10 dark:bg-white/5"
              />
            </div>

            <div>
              <Label htmlFor={`signup-${selectedTab}-password`} className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/80">
                Mot de passe<span className="text-error-500">*</span>
              </Label>
              <Input
                id={`signup-${selectedTab}-password`}
                name="password"
                type="password"
                placeholder="Minimum 6 caracteres"
                className="h-[52px] rounded-2xl border-gray-200 bg-white/80 dark:border-white/10 dark:bg-white/5"
              />
            </div>

            <div>
              <Label htmlFor={`signup-${selectedTab}-confirm-password`} className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/80">
                Confirmer le mot de passe<span className="text-error-500">*</span>
              </Label>
              <Input
                id={`signup-${selectedTab}-confirm-password`}
                name="confirm_password"
                type="password"
                placeholder="Retapez le mot de passe"
                className="h-[52px] rounded-2xl border-gray-200 bg-white/80 dark:border-white/10 dark:bg-white/5"
              />
            </div>

            <Button type="submit" className="h-[52px] w-full justify-center rounded-2xl text-[15px] font-semibold">
              {selectedTab === "teacher"
                ? "Creer mon compte enseignant"
                : selectedTab === "admin"
                  ? "Creer mon compte administrateur"
                  : "Creer mon compte etudiant"}
            </Button>
          </form>

          <p className="mt-6 text-sm leading-7 text-gray-600 dark:text-white/70">
            Vous avez deja un compte ?{" "}
            <Link href={signInHref} className="font-semibold text-[#058AC5] hover:text-[#046b99] dark:text-[#6ec7ea]">
              Se connecter
            </Link>
          </p>
        </div>

        <div className="mt-6 animate-fade-up rounded-[28px] border border-gray-200/70 bg-white/70 p-5 backdrop-blur-md dark:border-white/10 dark:bg-white/4 [animation-delay:220ms]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500 dark:text-white/50">Prevalidation</p>
          <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">Acces conditionne par les donnees academiques</p>
          <p className="mt-3 text-sm leading-7 text-gray-600 dark:text-white/70">
            La creation de compte reste alignee sur les enregistrements existants dans les tables etudiants ou agents afin de preserver la coherence des profils et des roles.
          </p>
        </div>
      </div>
    </div>
  );
}
