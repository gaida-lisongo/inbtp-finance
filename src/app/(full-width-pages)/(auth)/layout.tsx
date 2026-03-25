import GridShape from "@/components/common/GridShape";
import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";

import { ThemeProvider } from "@/context/ThemeContext";
import Image from "next/image";
import Link from "next/link";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-1 overflow-hidden bg-white p-6 dark:bg-gray-900 sm:p-0">
      <div className="absolute inset-0">
        <Image
          src="/images/brand/inbtp.jpg"
          alt="INBTP"
          fill
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-white/45 backdrop-blur-md dark:bg-gray-950/70" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,45,32,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(21,94,117,0.18),transparent_35%)]" />
      </div>
      <ThemeProvider>
        <div className="relative flex h-screen w-full flex-col justify-center sm:p-0 lg:flex-row dark:bg-gray-900/10">
          {children}
          <div className="hidden h-full w-full items-center lg:grid lg:w-1/2">
            <div className="relative z-1 flex items-center justify-center">
              {/* <!-- ===== Common Grid Shape Start ===== --> */}
              <GridShape />
              <div className="animate-float-soft flex max-w-sm flex-col items-center rounded-[32px] border border-white/15 bg-black/45 px-10 py-12 shadow-2xl backdrop-blur-xl">
                <Link href="/" className="animate-rise-in block mb-5">
                  <Image
                    width={210}
                    height={96}
                    src="/images/logo/logo.png"
                    alt="ElmesFin"
                    className="h-auto w-auto drop-shadow-xl"
                  />
                </Link>
                <div className="animate-rise-in text-center [animation-delay:140ms]">
                  <p className="text-sm font-semibold uppercase tracking-[0.32em] text-error-300">
                    {process.env.NEXT_PUBLIC_SCHOOL_NAME ?? "Votre ecole"}
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold text-white">
                    Gestion financiere INBTP
                  </h2>
                </div>
                <p className="animate-rise-in mt-5 text-center text-sm leading-6 text-white/75 [animation-delay:220ms]">
                  {process.env.NEXT_PUBLIC_SCHOOL_NAME ?? "Votre ecole"} - plateforme moderne de suivi des encaissements, frais et modalites de paiement.
                </p>
              </div>
            </div>
          </div>
          <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
            <ThemeTogglerTwo />
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}
