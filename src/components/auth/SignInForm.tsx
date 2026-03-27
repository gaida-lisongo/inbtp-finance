import Link from "next/link";

import Button from "@/components/ui/button/Button";
import { ChevronLeftIcon } from "@/icons";

type SignInFormProps = {
  error?: string;
};

export default function SignInForm({ error }: SignInFormProps) {
  return (
    <div className="flex flex-col flex-1 w-full lg:w-1/2">
      <div className="w-full max-w-md mx-auto mb-5 sm:pt-10">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon />
          Retour au dashboard
        </Link>
      </div>

      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] sm:p-8">
          <div className="mb-6">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Connexion SSO
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Connectez-vous avec votre compte Microsoft Azure Active Directory.
            </p>
          </div>

          {error ? (
            <div className="mb-5 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
              {error}
            </div>
          ) : null}

          <Link href="/api/login?next=%2F" className="block">
            <Button className="w-full justify-center" size="sm">
              <span className="inline-flex items-center gap-3">
                <svg
                  width="21"
                  height="20"
                  viewBox="0 0 21 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1.25 2.1875L9.07812 1.11816V9.0625H1.25V2.1875ZM10.4219 0.925781L19.75 -0.000976562V9.0625H10.4219V0.925781ZM1.25 10.3125H9.07812V18.2568L1.25 17.1875V10.3125ZM10.4219 10.3125H19.75V19.376L10.4219 18.4492V10.3125Z"
                    fill="currentColor"
                  />
                </svg>
                Se connecter avec Azure SSO
              </span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
