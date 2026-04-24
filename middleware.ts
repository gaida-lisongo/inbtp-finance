import { NextRequest, NextResponse } from "next/server";
import Authentication from "@/lib/user/Authentication";

// On instancie Authentication pour accéder à decrypt
const auth = new Authentication();

// Chemins qui ne doivent jamais être bloqués (statiques, images, etc.)
const PUBLIC_FILE_CHECK = /\.(.*)$/;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("session")?.value;

  // 1. Ignorer les fichiers statiques et quelques endpoints publics
  if (
    PUBLIC_FILE_CHECK.test(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") || // On laisse passer les appels à ton API d'auth
    pathname.startsWith("/auth") // Callback / routes auth (compat)
  ) {
    return NextResponse.next();
  }

  // 2. Routes publiques: signin/signup (mais on redirige si déjà connecté)
  if (pathname.startsWith("/signin") || pathname.startsWith("/signup")) {
    if (!session) {
      return NextResponse.next();
    }

    try {
      await auth.decrypt(session);
      return NextResponse.redirect(new URL("/", request.url));
    } catch {
      const response = NextResponse.next();
      response.cookies.delete("session");
      return response;
    }
  }

  // 3. Protection globale (dashboard) : tout le reste requiert un cookie session valide
  if (!session) {
    const url = new URL("/signin", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  try {
    await auth.decrypt(session);
    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL("/signin", request.url));
    response.cookies.delete("session");
    return response;
  }

  return NextResponse.next();
}

// Configurer le matcher pour exclure ce qui n'est pas nécessaire
export const config = {
  matcher: [
    /*
     * Matcher toutes les routes sauf celles commençant par :
     * - api (routes API)
     * - _next/static (fichiers statiques)
     * - _next/image (optimisation d'images)
     * - favicon.ico (icône du site)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
