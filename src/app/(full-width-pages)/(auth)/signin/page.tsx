import SignInForm from "@/components/auth/SignInForm";
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
  }>;
};

export default async function SignIn({ searchParams }: SignInPageProps) {
  const [user, params] = await Promise.all([getAuthenticatedUser(), searchParams]);

  if (user) {
    redirect("/");
  }

  return <SignInForm error={params.error} />;
}
