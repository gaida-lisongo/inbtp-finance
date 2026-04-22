"use client";

import React, { useState, useEffect, useRef } from "react";
import { getAgentsAction } from "@/app/actions/agents";
import type { AgentRecord } from "@/lib/utils/supabase/agents-shared";

interface FindAgentProps {
  onSelect: (agent: AgentRecord | null) => void;
  label?: string;
  placeholder?: string;
  defaultAgent?: { id: string; nom: string | null; prenom: string | null; post_nom: string | null } | null;
  required?: boolean;
}

export default function FindAgent({
  onSelect,
  label = "Rechercher un agent",
  placeholder = "Saisissez un nom...",
  defaultAgent,
  required = false,
}: FindAgentProps) {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [query, setQuery] = useState(
    defaultAgent
      ? [defaultAgent.prenom, defaultAgent.post_nom, defaultAgent.nom].filter(Boolean).join(" ")
      : ""
  );
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadAgents() {
      try {
        const data = await getAgentsAction();
        setAgents(data);
      } catch (error) {
        console.error("Failed to load agents", error);
      } finally {
        setLoading(false);
      }
    }
    loadAgents();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredAgents = agents.filter((agent) => {
    const fullName = [agent.prenom, agent.post_nom, agent.nom].filter(Boolean).join(" ").toLowerCase();
    return fullName.includes(query.toLowerCase());
  });

  const handleSelect = (agent: AgentRecord) => {
    const fullName = [agent.prenom, agent.post_nom, agent.nom].filter(Boolean).join(" ");
    setQuery(fullName);
    setIsOpen(false);
    onSelect(agent);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsOpen(true);
    if (e.target.value.trim() === "") {
      onSelect(null);
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
          {label} {required && <span className="text-error-500">*</span>}
        </label>
      )}
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        required={required}
        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
      />
      {loading && (
        <div className="absolute right-3 top-[38px]">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
        </div>
      )}
      {isOpen && query && !loading && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-800 dark:bg-gray-900">
          {filteredAgents.length === 0 ? (
            <li className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">Aucun agent trouvé</li>
          ) : (
            filteredAgents.map((agent) => {
              const fullName = [agent.prenom, agent.post_nom, agent.nom].filter(Boolean).join(" ");
              return (
                <li
                  key={agent.id}
                  onClick={() => handleSelect(agent)}
                  className="cursor-pointer px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <div className="font-medium">{fullName}</div>
                  <div className="text-xs text-gray-500">{agent.email}</div>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
