import React from "react";

type PromotionLayoutProps = {
  children: React.ReactNode;
};

export default function PromotionLayout({ children }: PromotionLayoutProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
          Espace Promotion
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Cette section centralise les pages d&apos;une promotion dans une annee academique
          selectionnee depuis la sidebar.
        </p>
      </div>
      {children}
    </div>
  );
}
