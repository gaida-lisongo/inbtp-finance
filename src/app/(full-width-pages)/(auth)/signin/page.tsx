import SignInForm from "@/components/auth/SignInForm";
import { getSafeNextPath } from "@/lib/utils/supabase/auth";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Next.js SignIn Page | TailAdmin - Next.js Dashboard Template",
  description: "This is Next.js Signin Page TailAdmin Dashboard Template",
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
