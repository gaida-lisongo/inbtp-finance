import { getUser } from "@/app/actions/user";
import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Connexion - ELMESACAD",
  description: "Connectez-vous à ELMESACAD pour accéder à l'espace numérique de travail de l'INBTP.",
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
  const [user, params] = await Promise.all([getUser(), searchParams]);

  if (user) {
    redirect(params.next || "/");
  }

  return (
    <SignInForm
      error={params.error}
      message={params.message}
      nextPath={params.next || "/"}
      selectedTab={getSelectedTab(params.tab)}
    />
  );
}