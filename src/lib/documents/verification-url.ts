export const getPublicVerificationBaseUrl = () =>
  process.env.NEXT_PUBLIC_HOST_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

export const buildPublicVerificationUrl = (input: { pathname: string; searchParams?: Record<string, string | null | undefined> }) => {
  const baseUrl = getPublicVerificationBaseUrl();
  const pathname = input.pathname.startsWith("/") ? input.pathname : `/${input.pathname}`;
  const query = new URLSearchParams();

  if (input.searchParams) {
    for (const [key, value] of Object.entries(input.searchParams)) {
      if (typeof value === "string" && value.trim().length > 0) {
        query.set(key, value);
      }
    }
  }

  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return `${baseUrl}${pathname}${suffix}`;
};

