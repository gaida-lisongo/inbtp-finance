"use client";
import React, { useState } from "react";
import ProgrammeDeliberationCard from "./ProgrammeDeliberationCard";

type JuryPromotionCardProps = {
  jury: {
    id: string;
    designation: string | null;
    annee: {
      designation: string | null;
    } | null;
    isActivate: boolean | null;
    president: { prenom: string | null; post_nom: string | null; nom: string | null } | null;
    secretaire: { prenom: string | null; post_nom: string | null; nom: string | null } | null;
  };
  programmes: Array<{
    id: string;
    designation: string | null;
    description: string | null;
    annee_id: string | null;
  }>;
};

export default function JuryPromotionCard({ jury, programmes }: JuryPromotionCardProps) {
  const [isExpanded, setExpanded] = useState(false);

  const presidentLabel = jury.president
    ? [jury.president.prenom, jury.president.post_nom, jury.president.nom]
        .filter(Boolean)
        .join(" ")
    : "Non renseigné";

  const secretaireLabel = jury.secretaire
    ? [jury.secretaire.prenom, jury.secretaire.post_nom, jury.secretaire.nom]
        .filter(Boolean)
        .join(" ")
    : "Non renseigné";

  return (
    <article className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm shadow-gray-100 dark:border-gray-800 dark:bg-gray-900">
      <div className="relative h-48 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url(/images/cards/card-01.jpg)",
          }}
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative flex h-full flex-col justify-between p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/70">
                Jury
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              {jury.designation ?? "Jury sans désignation"}
            </h2>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">
              {jury.isActivate ? "Actif" : "Inactif"}
            </p>
            <p className="text-white/80">
              {jury.annee?.designation ?? "Année inconnue"}
            </p>
          </div>
        </div>
          <div className="mt-4 flex flex-col gap-2 text-sm">
            <p className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold tracking-wide text-white">
              Président :{" "}
              <span className="font-normal text-white">{presidentLabel}</span>
            </p>
            <p className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold tracking-wide text-white">
              Secrétaire :{" "}
              <span className="font-normal text-white">{secretaireLabel}</span>
            </p>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <button
              onClick={() => setExpanded((prev) => !prev)}
              className="rounded-full border border-white/60 px-4 py-1 text-white transition hover:border-white hover:bg-white/10"
            >
              {isExpanded ? "Réduire" : "Explorer ce jury"}
            </button>
          <span className="text-white/80">
            {programmes.length} promotion{programmes.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>
      {isExpanded && (
        <div className="p-6">
          {programmes.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-300">
              Aucune promotion disponible pour cette année.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {programmes.map((programme) => (
                <ProgrammeDeliberationCard
                  key={programme.id}
                  programme={programme}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
