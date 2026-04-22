"use client";

import React, { useState } from "react";
import Button from "@/components/ui/button/Button";
import FindAnnee from "@/components/common/FindAnnee";
import FindAgent from "@/components/common/FindAgent";
import type { AnneeRecord } from "@/lib/utils/supabase/annees";
import type { AgentRecord } from "@/lib/utils/supabase/agents-shared";

interface JuryCreateProps {
  onCreate?: (payload: any) => void;
  onClose?: () => void;
}

const STEPS = ["Année académique", "Composition du Bureau", "Confirmation"];

export default function JuryCreate({ onCreate, onClose }: JuryCreateProps) {
  const [step, setStep] = useState(0);

  // Step 1
  const [annee, setAnnee] = useState<AnneeRecord | null>(null);
  const [designation, setDesignation] = useState("");

  // Step 2
  const [president, setPresident] = useState<AgentRecord | null>(null);
  const [secretaire, setSecretaire] = useState<AgentRecord | null>(null);
  const [password, setPassword] = useState("");
  const [isActivate, setIsActivate] = useState(false);

  const canGoNextStep1 = !!annee && designation.trim().length > 0;
  const canGoNextStep2 = !!president && !!secretaire;

  const handleSubmit = () => {
    onCreate?.({
      designation,
      annee_id: annee!.id,
      president_id: president?.id || null,
      secretaire_id: secretaire?.id || null,
      isActivate,
      password: password || "123456",
    });
  };

  const presidentName = president
    ? [president.prenom, president.post_nom, president.nom].filter(Boolean).join(" ")
    : "Non défini";
  const secretaireName = secretaire
    ? [secretaire.prenom, secretaire.post_nom, secretaire.nom].filter(Boolean).join(" ")
    : "Non défini";

  return (
    <div className="p-6 sm:p-8">
      {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center gap-0">
          {STEPS.map((label, index) => (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                    index < step
                      ? "bg-brand-500 text-white"
                      : index === step
                      ? "bg-brand-500 text-white ring-4 ring-brand-500/20"
                      : "bg-gray-100 text-gray-400 dark:bg-gray-800"
                  }`}
                >
                  {index < step ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 7L6 11L12 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`mt-1.5 text-[11px] font-medium ${
                    index <= step ? "text-brand-500" : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`mb-5 h-px flex-1 transition-all ${
                    index < step ? "bg-brand-500" : "bg-gray-200 dark:bg-gray-700"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step 1: Année académique */}
      {step === 0 && (
        <div className="space-y-5">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">Choix de l'année académique</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sélectionnez l'année pour laquelle ce bureau de jury sera créé, puis donnez-lui un nom.
          </p>

          <FindAnnee
            label="Année académique"
            placeholder="Rechercher une année..."
            onSelect={setAnnee}
            required
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Désignation du jury <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="Ex: Jury Informatique L1"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Annuler
            </button>
            <Button onClick={() => setStep(1)} disabled={!canGoNextStep1}>
              Suivant →
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Composition du Bureau */}
      {step === 1 && (
        <div className="space-y-5">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">Composition du Bureau</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Désignez le président et le secrétaire du bureau du jury.
          </p>

          <FindAgent
            label="Président du Jury"
            onSelect={setPresident}
            placeholder="Rechercher un agent..."
            required
          />

          <FindAgent
            label="Secrétaire du Jury"
            onSelect={setSecretaire}
            placeholder="Rechercher un agent..."
            required
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Mot de passe d'accès
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Défaut : 123456"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <input
              type="checkbox"
              id="isActivate"
              checked={isActivate}
              onChange={(e) => setIsActivate(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900"
            />
            <label htmlFor="isActivate" className="text-sm font-medium text-gray-700 dark:text-gray-400">
              Activer ce jury immédiatement
            </label>
          </div>

          <div className="flex justify-between gap-3 pt-4">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              ← Retour
            </button>
            <Button onClick={() => setStep(2)} disabled={!canGoNextStep2}>
              Suivant →
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Confirmation */}
      {step === 2 && (
        <div className="space-y-5">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">Confirmation de la structure</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Vérifiez les informations avant de créer le bureau du jury.
          </p>

          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-gray-50 dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900/50">
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Année</span>
              <span className="text-sm font-semibold text-gray-800 dark:text-white/90">{annee?.designation}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Désignation</span>
              <span className="text-sm font-semibold text-gray-800 dark:text-white/90">{designation}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Président</span>
              <span className="text-sm font-semibold text-gray-800 dark:text-white/90">{presidentName}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Secrétaire</span>
              <span className="text-sm font-semibold text-gray-800 dark:text-white/90">{secretaireName}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Statut</span>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                  isActivate
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                    : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300"
                }`}
              >
                {isActivate ? "Actif" : "Inactif"}
              </span>
            </div>
          </div>

          <div className="flex justify-between gap-3 pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              ← Retour
            </button>
            <Button onClick={handleSubmit}>
              Créer le Jury ✓
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
