"use client";

import React, { useState } from "react";
import Button from "@/components/ui/button/Button";
import FindAgent from "@/components/common/FindAgent";
import type { JuryWithMembers } from "@/lib/utils/supabase/jury";
import type { AgentRecord } from "@/lib/utils/supabase/agents-shared";

interface JuryUpdateProps {
  item: JuryWithMembers;
  onUpdate?: (payload: any) => void;
  onClose?: () => void;
}

export default function JuryUpdate({ item, onUpdate, onClose }: JuryUpdateProps) {
  const [designation, setDesignation] = useState(item.designation || "");
  const [president, setPresident] = useState<AgentRecord | null>(item.president as any);
  const [secretaire, setSecretaire] = useState<AgentRecord | null>(item.secretaire as any);
  const [isActivate, setIsActivate] = useState(item.isActivate || false);
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate?.({
      id: item.id,
      designation,
      president_id: president?.id || null,
      secretaire_id: secretaire?.id || null,
      isActivate,
      ...(password ? { password } : {}),
    });
  };

  return (
    <div className="p-6 sm:p-8">
      <h3 className="mb-6 text-xl font-semibold text-gray-800 dark:text-white/90">Modifier le Jury</h3>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Désignation
          </label>
          <input
            type="text"
            required
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>

        <FindAgent
          label="Président du Jury"
          onSelect={setPresident}
          defaultAgent={item.president}
          placeholder="Rechercher un agent..."
        />

        <FindAgent
          label="Secrétaire du Jury"
          onSelect={setSecretaire}
          defaultAgent={item.secretaire}
          placeholder="Rechercher un agent..."
        />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Nouveau mot de passe (optionnel)
          </label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Laisser vide pour ne pas modifier"
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <input
            type="checkbox"
            id="isActivateUpdate"
            checked={isActivate}
            onChange={(e) => setIsActivate(e.target.checked)}
            className="h-5 w-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:checked:bg-brand-500"
          />
          <label htmlFor="isActivateUpdate" className="text-sm font-medium text-gray-700 dark:text-gray-400">
            Jury actif
          </label>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            Annuler
          </button>
          <Button type="submit">Enregistrer</Button>
        </div>
      </form>
    </div>
  );
}
