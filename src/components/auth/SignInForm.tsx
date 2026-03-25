"use client";

import { signInWithAzureAction } from "@/app/(full-width-pages)/(auth)/signin/actions";
import Button from "@/components/ui/button/Button";
import Link from "next/link";
import React from "react";

type SignInFormProps = {
  schoolName: string;
  ssoReturnUrl: string;
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
  ssoReturnUrl,
  nextPath,
  errorMessage,
}: SignInFormProps) {
  const loginUrl = getLoginUrl(nextPath);
  const readableErrorMessage = getReadableErrorMessage(errorMessage);

  return (
    <div className="flex w-full flex-1 flex-col px-6 lg:w-1/2 lg:px-0">
      <div className="mx-auto mb-5 w-full max-w-md pt-10">
        <span className="inline-flex items-center rounded-full border border-white/15 bg-black/35 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-md">
          Application metier
        </span>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="mb-5 sm:mb-8">
          <h1 className="mb-3 text-title-sm font-semibold text-gray-900 dark:text-white sm:text-title-md">
            {schoolName}
          </h1>
          <p className="text-base text-gray-700 dark:text-white/70">
            Connectez-vous a l&apos;application de gestion de finance de l&apos;ecole avec votre compte Microsoft 365.
          </p>
        </div>

        <div className="rounded-2xl border border-white/15 bg-black/45 p-6 shadow-theme-sm backdrop-blur-xl">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0078D4] text-lg font-semibold text-white">
              M
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                Connexion Microsoft Entra ID
              </p>
              <p className="mt-1 text-sm text-white/65">
                URL de retour: <span className="font-medium">{ssoReturnUrl || "non configuree"}</span>
              </p>
            </div>
          </div>

          {readableErrorMessage ? (
            <div className="mb-5 rounded-lg border border-error-400/30 bg-error-500/12 px-4 py-3 text-sm text-error-200">
              {readableErrorMessage}
            </div>
          ) : (
            <div className="mb-5 rounded-lg border border-brand-400/25 bg-brand-500/12 px-4 py-3 text-sm text-brand-100">
              Cliquez sur le bouton ci-dessous pour acceder a la connexion SSO de l&apos;ecole.
            </div>
          )}

          <ul className="mb-6 space-y-3 text-sm text-white/70">
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

          <p className="mt-4 text-center text-xs text-white/60">
            Vous pouvez aussi utiliser{" "}
            <Link href={loginUrl} className="text-brand-300 hover:text-brand-200">
              ce lien direct
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
