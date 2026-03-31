import SignUpForm from "@/components/auth/SignUpForm";
import { getSafeNextPath } from "@/lib/utils/supabase/auth";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Next.js SignUp Page | TailAdmin - Next.js Dashboard Template",
  description: "This is Next.js SignUp Page TailAdmin Dashboard Template",
  // other metadata
};

type SignUpPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function SignUp({ searchParams }: SignUpPageProps) {
  const [user, params] = await Promise.all([getAuthenticatedUser(), searchParams]);
  const nextPath = getSafeNextPath(params.next);

  if (user) {
    redirect("/");
  }

  return <SignUpForm error={params.error} nextPath={nextPath} />;
}
