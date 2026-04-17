import SignInForm from "@/components/auth/SignInForm";
import { getSafeNextPath } from "@/lib/utils/supabase/auth";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connectez-vous a ELMESACAD pour acceder a l'espace numerique de travail de l'INBTP.",
};

type SignInPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
    next?: string;
    tab?: string;
  }>;
};

const getSelectedTab = (value?: string): "student" | "teacher" | "admin" => {
  if (value === "teacher" || value === "admin") {
    return value;
  }

  return "student";
};

export default async function SignIn({ searchParams }: SignInPageProps) {
  const [user, params] = await Promise.all([getAuthenticatedUser(), searchParams]);
  const nextPath = getSafeNextPath(params.next);

  if (user) {
    redirect("/");
  }

  return (
    <SignInForm
      error={params.error}
      message={params.message}
      nextPath={nextPath}
      selectedTab={getSelectedTab(params.tab)}
    />
  );
}
