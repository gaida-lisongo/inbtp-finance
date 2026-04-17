import Link from "next/link";

type ImmersiveErrorStateProps = {
  code: string;
  title: string;
  description: string;
};

export default function ImmersiveErrorState({ code, title, description }: ImmersiveErrorStateProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10">
      <div
        className="absolute -inset-6 bg-cover bg-center blur-xl scale-110"
        style={{ backgroundImage: "url('/images/inbtp/campus.png')" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(39,40,38,0.76),rgba(39,40,38,0.52),rgba(5,138,197,0.28))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(247,167,61,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(94,203,68,0.12),transparent_24%)]" />

      <div className="relative z-10 w-full max-w-3xl rounded-[32px] border border-white/18 bg-white/94 p-8 text-center shadow-[0_30px_90px_rgba(39,40,38,0.22)] sm:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.42em] text-gray-500">ELMESACAD</p>
        <p className="mt-6 text-6xl font-semibold tracking-tight text-[#272826] sm:text-7xl">{code}</p>
        <h1 className="mt-6 text-3xl font-semibold text-[#272826] sm:text-4xl">{title}</h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-gray-600">{description}</p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex min-w-44 items-center justify-center rounded-2xl bg-[#f7a73d] px-6 py-3.5 text-sm font-semibold text-[#272826] transition hover:brightness-105"
          >
            Retour a l'accueil
          </Link>
          <Link
            href="/signin"
            className="inline-flex min-w-44 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 px-6 py-3.5 text-sm font-semibold text-[#272826] transition hover:bg-gray-100"
          >
            Ouvrir la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
