"use client";

import { signInWithAzureAction } from "@/app/(full-width-pages)/(auth)/signin/actions";
import Button from "@/components/ui/button/Button";
import Link from "next/link";
import React from "react";

type SignInFormProps = {
  schoolName: string;
  ssoDomain: string;
  nextPath?: string;
  errorMessage?: string;
};

const getReadableErrorMessage = (errorMessage?: string) => {
  if (!errorMessage) {
    return null;
  }

  if (errorMessage === "insufficient_group_privilege") {
    return "Votre compte ne dispose pas du privilege necessaire pour acceder a cette application.";
  }

  return `La connexion SSO a echoue. Detail: ${errorMessage}`;
};

const getLoginUrl = (nextPath?: string) => {
  const params = new URLSearchParams();

  if (nextPath && nextPath.startsWith("/")) {
    params.set("next", nextPath);
  }

  const queryString = params.toString();

  return queryString ? `/api/login?${queryString}` : "/api/login";
};

export default function SignInForm({
  schoolName,
  ssoDomain,
  nextPath,
  errorMessage,
}: SignInFormProps) {
  const loginUrl = getLoginUrl(nextPath);
  const readableErrorMessage = getReadableErrorMessage(errorMessage);

  return (
    <div className="flex w-full flex-1 flex-col px-6 lg:w-1/2 lg:px-0">
      <div className="mx-auto mb-5 w-full max-w-md pt-10">
        <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:border-brand-800 dark:bg-brand-500/10 dark:text-brand-300">
          Application metier
        </span>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="mb-5 sm:mb-8">
          <h1 className="mb-3 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
            {schoolName}
          </h1>
          <p className="text-base text-gray-500 dark:text-gray-400">
            Connectez-vous a l&apos;application de gestion de finance de l&apos;ecole avec votre compte Microsoft scolaire.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0078D4] text-lg font-semibold text-white">
              M
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                Connexion Microsoft Entra ID
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Domaine SSO: <span className="font-medium">{ssoDomain || "non configure"}</span>
              </p>
            </div>
          </div>

          {readableErrorMessage ? (
            <div className="mb-5 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
              {readableErrorMessage}
            </div>
          ) : (
            <div className="mb-5 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
              Cliquez sur le bouton ci-dessous pour acceder a la connexion SSO de l&apos;ecole.
            </div>
          )}

          <ul className="mb-6 space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <li>- Authentification SSO Azure de l&apos;ecole</li>
            <li>- Recuperation des claims utilisateur et des groupes</li>
            <li>- Redirection vers l&apos;application apres connexion</li>
          </ul>

          <form action={signInWithAzureAction} className="space-y-4">
            <input
              type="hidden"
              name="next"
              value={nextPath && nextPath.startsWith("/") ? nextPath : "/"}
            />
            <Button className="w-full" size="sm">
              Continuer avec le SSO de l&apos;ecole
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
            Vous pouvez aussi utiliser{" "}
            <Link href={loginUrl} className="text-brand-500 hover:text-brand-600 dark:text-brand-400">
              ce lien direct
            </Link>
            .
          </p>
        </div>

        <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          <Link href="/" className="transition-colors hover:text-gray-700 dark:hover:text-gray-300">
            Retour a l&apos;application
          </Link>
        </div>
      </div>
    </div>
  );
}
