import Link from "next/link";

import { signInStudentAction, signInTeacherAction, signInWithAzureAction } from "@/app/actions/auth";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { ChevronLeftIcon } from "@/icons";

type AuthTab = "student" | "teacher" | "admin";

type SignInFormProps = {
  error?: string;
  message?: string;
  nextPath: string;
  selectedTab: AuthTab;
};

const getErrorMessage = (error?: string) => {
  switch (error) {
    case "access_denied":
      return "Votre compte est connecte, mais il ne dispose pas d'un acces aux vues administratives.";
    case "missing_credentials":
      return "Renseignez votre email et votre mot de passe.";
    case "student_not_found":
      return "Aucun profil etudiant correspondant a cet email n'a ete trouve.";
    case "student_already_linked":
      return "Ce profil etudiant est deja rattache a un autre compte.";
    case "student_email_conflict":
      return "Plusieurs etudiants portent le meme email. Corrigez d'abord les donnees.";
    case "teacher_not_found":
      return "Aucun profil enseignant titulaire correspondant a cet email n'a ete trouve.";
    case "teacher_already_linked":
      return "Ce profil enseignant est deja rattache a un autre compte.";
    case "teacher_email_conflict":
      return "Plusieurs agents portent le meme email. Corrigez d'abord les donnees.";
    case "teacher_already_registered":
      return "Cet enseignant possede deja un compte. Utilisez plutot la connexion.";
    case "faculty_sso_restricted":
      return "La connexion SSO est reservee aux administrateurs et gestionnaires de la faculte.";
    case "Invalid login credentials":
      return "Email ou mot de passe incorrect.";
    case "Email not confirmed":
      return "Votre email n'est pas encore confirme.";
    case "auth_failed":
      return "La session n'a pas pu etre finalisee.";
    default:
      return error;
  }
};

const getMessage = (message?: string) => {
  switch (message) {
    case "signup_confirmation_sent":
      return "Un email de confirmation a ete envoye. Ouvrez votre boite mail pour activer votre compte.";
    case "student_email_confirmed":
      return "Votre email etudiant a ete confirme. Vous pouvez maintenant vous connecter.";
    case "teacher_email_confirmed":
      return "Votre email enseignant a ete confirme. Vous pouvez maintenant vous connecter.";
    default:
      return message;
  }
};

const getTabHref = (tab: AuthTab, nextPath: string) =>
  `/signin?tab=${tab}${nextPath !== "/" ? `&next=${encodeURIComponent(nextPath)}` : ""}`;

const getSignUpHref = (tab: Exclude<AuthTab, "admin">, nextPath: string) =>
  `/signup?tab=${tab}${nextPath !== "/" ? `&next=${encodeURIComponent(nextPath)}` : ""}`;

const tabClassName = (isActive: boolean) =>
  `flex-1 rounded-xl px-4 py-3 text-center text-sm font-medium transition ${
    isActive
      ? "bg-brand-500 text-white shadow-theme-xs"
      : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
  }`;

export default function SignInForm({ error, message, nextPath, selectedTab }: SignInFormProps) {
  const signUpHref = selectedTab === "teacher" ? getSignUpHref("teacher", nextPath) : getSignUpHref("student", nextPath);
  const isPasswordTab = selectedTab === "student" || selectedTab === "teacher";
  const formAction = selectedTab === "teacher" ? signInTeacherAction : signInStudentAction;
  const heading =
    selectedTab === "teacher"
      ? "Connexion enseignant"
      : selectedTab === "admin"
        ? "Connexion administration"
        : "Connexion etudiant";
  const description =
    selectedTab === "teacher"
      ? "Utilisez votre email enregistre dans la table agents et votre mot de passe Supabase."
      : selectedTab === "admin"
        ? "Les administrateurs et gestionnaires de section continuent a utiliser l'authentification SSO Microsoft."
        : "Utilisez votre email institutionnel enregistre dans la base et votre mot de passe Supabase.";

  return (
    <div className="flex w-full flex-1 flex-col lg:w-1/2">
      <div className="mx-auto mb-5 w-full max-w-md sm:pt-10">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon />
          Retour au dashboard
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] sm:p-8">
          <div className="mb-6">
            <h1 className="mb-2 text-title-sm font-semibold text-gray-800 dark:text-white/90 sm:text-title-md">
              {heading}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
          </div>

          <div className="mb-6 flex rounded-2xl bg-gray-50 p-1 dark:bg-gray-900">
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
            <div className="mb-5 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
              {getErrorMessage(error)}
            </div>
          ) : null}

          {message ? (
            <div className="mb-5 rounded-xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300">
              {getMessage(message)}
            </div>
          ) : null}

          {isPasswordTab ? (
            <form action={formAction} className="space-y-5">
              <input type="hidden" name="next" value={nextPath} />

              <div>
                <Label htmlFor={`${selectedTab}-email`}>
                  Email<span className="text-error-500">*</span>
                </Label>
                <Input id={`${selectedTab}-email`} name="email" type="email" placeholder="prenom.nom@exemple.com" />
              </div>

              <div>
                <Label htmlFor={`${selectedTab}-password`}>
                  Mot de passe<span className="text-error-500">*</span>
                </Label>
                <Input id={`${selectedTab}-password`} name="password" type="password" placeholder="Votre mot de passe" />
              </div>

              <Button type="submit" className="w-full justify-center">
                {selectedTab === "teacher" ? "Se connecter comme enseignant" : "Se connecter comme etudiant"}
              </Button>
            </form>
          ) : (
            <form action={signInWithAzureAction}>
              <input type="hidden" name="next" value={nextPath} />
              <Button type="submit" variant="outline" className="w-full justify-center">
                Se connecter avec Azure SSO
              </Button>
            </form>
          )}

          {isPasswordTab ? (
            <p className="mt-6 text-sm text-gray-600 dark:text-gray-300">
              Vous n&apos;avez pas encore de mot de passe ?{" "}
              <Link href={signUpHref} className="font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400">
                {selectedTab === "teacher" ? "Creer mon acces enseignant" : "Creer mon acces etudiant"}
              </Link>
            </p>
          ) : (
            <p className="mt-6 text-sm text-gray-600 dark:text-gray-300">
              Les enseignants et les etudiants utilisent des identifiants Supabase distincts du SSO administratif.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
