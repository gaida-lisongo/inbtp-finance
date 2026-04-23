import { NextRequest, NextResponse } from "next/server";
import Authentication from "@/lib/user/Authentication";

// On instancie Authentication pour accéder à decrypt
const auth = new Authentication();

// Chemins qui ne doivent jamais être bloqués (statiques, images, etc.)
const PUBLIC_FILE_CHECK = /\.(.*)$/;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("session")?.value;

  // 1. Ignorer les fichiers statiques et l'API pour éviter de ralentir le serveur
  if (
    PUBLIC_FILE_CHECK.test(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") // On laisse passer les appels à ton API d'auth
  ) {
    return NextResponse.next();
  }

  // 2. Protection des routes Dashboard
  if (pathname.startsWith("/")) {
    if (!session) {
      const url = new URL("/signin", request.url);
      url.searchParams.set("next", pathname); // On garde en mémoire où il voulait aller
      return NextResponse.redirect(url);
    }

    try {
      const payload = await auth.decrypt(session);
      const userRole = payload.user?.role;

      // OPTIONNEL : Vérification stricte des accès par rôle
      // Si un étudiant essaie d'aller sur /dashboard/admin
      if (pathname.startsWith("/dashboard/admin") && userRole !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }

      return NextResponse.next();
    } catch (error) {
      // Session corrompue ou expirée
      const response = NextResponse.redirect(new URL("/signin", request.url));
      response.cookies.delete("session"); // On nettoie le mauvais cookie
      return response;
    }
  }

  // 3. Redirection si déjà connecté
  // Si l'utilisateur est déjà connecté et essaie d'aller sur /signin
  if (pathname.startsWith("/signin") && session) {
    try {
      await auth.decrypt(session);
      return NextResponse.redirect(new URL("/", request.url));
    } catch (e) {
      // Token invalide, on laisse la page de login s'afficher
    }
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