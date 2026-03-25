import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion SSO | Gestion Finance Ecole",
  description: "Connexion SSO de l'application de gestion de finance de l'ecole",
};

type SignInPageProps = {
  searchParams: Promise<{
    next?: string;
    error?: string;
  }>;
};

export default async function SignIn({ searchParams }: SignInPageProps) {
  const resolvedSearchParams = await searchParams;

  return (
    <SignInForm
      nextPath={resolvedSearchParams.next}
      errorMessage={resolvedSearchParams.error}
      schoolName={process.env.NEXT_PUBLIC_SCHOOL_NAME ?? "Votre ecole"}
      ssoReturnUrl={process.env.NEXT_PUBLIC_SSO_URL ?? ""}
    />
  );
}
