import Link from "next/link";

import { signUpStudentAction, signUpTeacherAction } from "@/app/actions/auth";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { ChevronLeftIcon } from "@/icons";

type SignUpTab = "student" | "teacher";

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
    case "User already registered":
      return "Un compte Supabase existe deja pour cet email.";
    default:
      return error;
  }
};

const tabClassName = (isActive: boolean) =>
  `flex-1 rounded-xl px-4 py-3 text-center text-sm font-medium transition ${
    isActive
      ? "bg-brand-500 text-white shadow-theme-xs"
      : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
  }`;

const getTabHref = (tab: SignUpTab, nextPath: string) =>
  `/signup?tab=${tab}${nextPath !== "/" ? `&next=${encodeURIComponent(nextPath)}` : ""}`;

export default function SignUpForm({ error, nextPath, selectedTab }: SignUpFormProps) {
  const signInHref = `/signin?tab=${selectedTab}${nextPath !== "/" ? `&next=${encodeURIComponent(nextPath)}` : ""}`;
  const formAction = selectedTab === "teacher" ? signUpTeacherAction : signUpStudentAction;
  const title = selectedTab === "teacher" ? "Creer mon acces enseignant" : "Creer mon acces etudiant";
  const description =
    selectedTab === "teacher"
      ? "Le compte est autorise si votre email existe deja dans la table agents avec le role titulaire."
      : "Le compte est autorise si votre email existe deja dans la table students.";

  return (
    <div className="flex w-full flex-1 flex-col lg:w-1/2">
      <div className="mx-auto mb-5 w-full max-w-md sm:pt-10">
        <Link
          href={signInHref}
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon />
          Retour a la connexion
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] sm:p-8">
          <div className="mb-6">
            <h1 className="mb-2 text-title-sm font-semibold text-gray-800 dark:text-white/90 sm:text-title-md">
              {title}
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
          </div>

          {error ? (
            <div className="mb-5 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
              {getErrorMessage(error)}
            </div>
          ) : null}

          <form action={formAction} className="space-y-5">
            <input type="hidden" name="next" value={nextPath} />

            <div>
              <Label htmlFor={`signup-${selectedTab}-email`}>
                Email<span className="text-error-500">*</span>
              </Label>
              <Input id={`signup-${selectedTab}-email`} name="email" type="email" placeholder="prenom.nom@exemple.com" />
            </div>

            <div>
              <Label htmlFor={`signup-${selectedTab}-password`}>
                Mot de passe<span className="text-error-500">*</span>
              </Label>
              <Input id={`signup-${selectedTab}-password`} name="password" type="password" placeholder="Minimum 6 caracteres" />
            </div>

            <div>
              <Label htmlFor={`signup-${selectedTab}-confirm-password`}>
                Confirmer le mot de passe<span className="text-error-500">*</span>
              </Label>
              <Input
                id={`signup-${selectedTab}-confirm-password`}
                name="confirm_password"
                type="password"
                placeholder="Retapez le mot de passe"
              />
            </div>

            <Button type="submit" className="w-full justify-center">
              {selectedTab === "teacher" ? "Creer mon compte enseignant" : "Creer mon compte etudiant"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-gray-600 dark:text-gray-300">
            Vous avez deja un compte ?{" "}
            <Link href={signInHref} className="font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
