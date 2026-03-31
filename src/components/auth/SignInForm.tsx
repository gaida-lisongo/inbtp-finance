import Link from "next/link";

import { signInStudentAction, signInWithAzureAction } from "@/app/actions/auth";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { ChevronLeftIcon } from "@/icons";

type SignInFormProps = {
  error?: string;
  message?: string;
  nextPath: string;
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
    case "Invalid login credentials":
      return "Email ou mot de passe incorrect.";
    case "Email not confirmed":
      return "Votre email n'est pas encore confirme.";
    case "auth_failed":
      return "La session etudiante n'a pas pu etre finalisee.";
    default:
      return error;
  }
};

const getMessage = (message?: string) => {
  switch (message) {
    case "signup_success":
      return "Compte cree. Si votre projet exige une confirmation email, verifiez votre boite mail avant de vous connecter.";
    case "signup_confirmation_sent":
      return "Un email de confirmation a ete envoye. Ouvrez votre boite mail pour activer votre compte etudiant.";
    case "student_email_confirmed":
      return "Votre email a ete confirme. Votre compte etudiant est maintenant synchronise, vous pouvez vous connecter.";
    default:
      return message;
  }
};

export default function SignInForm({ error, message, nextPath }: SignInFormProps) {
  const signUpHref = nextPath !== "/" ? `/signup?next=${encodeURIComponent(nextPath)}` : "/signup";

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
              Connexion etudiant
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Utilisez votre email institutionnel enregistre dans la base et votre mot de passe Supabase.
            </p>
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

          <form action={signInStudentAction} className="space-y-5">
            <input type="hidden" name="next" value={nextPath} />

            <div>
              <Label htmlFor="student-email">
                Email<span className="text-error-500">*</span>
              </Label>
              <Input id="student-email" name="email" type="email" placeholder="prenom.nom@exemple.com" />
            </div>

            <div>
              <Label htmlFor="student-password">
                Mot de passe<span className="text-error-500">*</span>
              </Label>
              <Input id="student-password" name="password" type="password" placeholder="Votre mot de passe" />
            </div>

            <Button type="submit" className="w-full justify-center">
              Se connecter comme etudiant
            </Button>
          </form>

          <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="text-sm font-semibold text-gray-900 dark:text-white/90">Connexion agent</div>
            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
              Les agents continuent a utiliser l&apos;authentification SSO Microsoft.
            </p>

            <form action={signInWithAzureAction} className="mt-4">
              <input type="hidden" name="next" value="/" />
              <Button type="submit" variant="outline" className="w-full justify-center">
                Se connecter avec Azure SSO
              </Button>
            </form>
          </div>

          <p className="mt-6 text-sm text-gray-600 dark:text-gray-300">
            Vous n&apos;avez pas encore de mot de passe ?{" "}
            <Link href={signUpHref} className="font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400">
              Creer mon acces etudiant
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
