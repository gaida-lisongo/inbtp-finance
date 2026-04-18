"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { signUpStudentWizardAction } from "@/app/actions/auth-student-wizard";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";

type StudentSearchResult = {
  id: string;
  nom: string | null;
  post_nom: string | null;
  prenom: string | null;
  email: string | null;
  grade: string | null;
};

type Step = "search" | "identite" | "securite";

const badge = (label: string, value?: string | null) => (
  <span className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 dark:border-white/10 dark:text-white/80">
    {label}: {value || "—"}
  </span>
);

export default function StudentSignUpWizard({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudentSearchResult[]>([]);
  const [selected, setSelected] = useState<StudentSearchResult | null>(null);
  const [isLoadingSearch, setLoadingSearch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [prenom, setPrenom] = useState("");
  const [sexe, setSexe] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [ville, setVille] = useState("");
  const [pays, setPays] = useState("");
  const [telephone, setTelephone] = useState("");
  const [commune, setCommune] = useState("");
  const [adresse, setAdresse] = useState("");
  const [bio, setBio] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const canContinueIdentite = useMemo(() => selected && prenom.trim() && dateNaissance.trim() && ville.trim() && pays.trim(), [selected, prenom, dateNaissance, ville, pays]);
  const canSubmit = useMemo(() => canContinueIdentite && password.length >= 6 && password === confirmPassword, [canContinueIdentite, password, confirmPassword]);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setLoadingSearch(true);
      setError(null);
      try {
        const resp = await fetch(`/api/students/search?q=${encodeURIComponent(query.trim())}`, { cache: "no-store" });
        const payload = (await resp.json()) as { ok?: boolean; students?: StudentSearchResult[]; error?: string };
        if (resp.ok && payload.ok) {
          setResults(payload.students ?? []);
        } else {
          setError(payload.error || "Recherche impossible.");
        }
      } catch {
        setError("Recherche impossible.");
      } finally {
        setLoadingSearch(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  const handleSubmit = () => {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      try {
        const form = new FormData();
        form.append("next", nextPath);
        form.append("student_id", selected.id);
        form.append("prenom", prenom);
        form.append("sexe", sexe);
        form.append("date_naissance", dateNaissance);
        form.append("ville", ville);
        form.append("pays", pays);
        form.append("telephone", telephone);
        form.append("commune", commune);
        form.append("adresse", adresse);
        form.append("bio", bio);
        if (photoDataUrl) {
          form.append("photo", photoDataUrl);
        }
        form.append("password", password);
        form.append("confirm_password", confirmPassword);
        await signUpStudentWizardAction(form);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "auth_failed";
        setError(msg);
      }
    });
  };

  const handlePhoto = async (file: File | null) => {
    if (!file) {
      setPhotoDataUrl(null);
      return;
    }
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      setError("Photo trop lourde (max 2MB).");
      return;
    }
    const buffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    setPhotoDataUrl(`data:${file.type};base64,${base64}`);
  };

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-200">
          {error}
        </div>
      ) : null}

      {step === "search" ? (
        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
          <Label className="text-sm font-semibold text-gray-800 dark:text-white/80">Rechercher votre profil (nom, post-nom, email)</Label>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: mbemba, ngenga, prenom.nom@inbtp.ac.cd"
            className="h-[52px] rounded-2xl border-gray-200 bg-white/80 dark:border-white/10 dark:bg-white/5"
          />
          {isLoadingSearch ? <p className="text-sm text-gray-500 dark:text-white/60">Recherche...</p> : null}
          {results.length > 0 ? (
            <div className="grid gap-2">
              {results.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => {
                    setSelected(row);
                    setPrenom(row.prenom ?? "");
                    setStep("identite");
                  }}
                  className={`rounded-xl border px-4 py-3 text-left transition hover:border-brand-300 ${
                    selected?.id === row.id ? "border-brand-400 bg-brand-50" : "border-gray-200 bg-white"
                  } dark:border-white/10 dark:bg-white/5`}
                >
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-800 dark:text-white/80">
                    {badge("Nom", row.nom)}
                    {badge("Post-nom", row.post_nom)}
                    {badge("Prenom", row.prenom)}
                    {badge("Email", row.email)}
                    {badge("Grade", row.grade)}
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {step === "identite" && selected ? (
        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
          <div className="flex flex-wrap gap-2 text-sm text-gray-800 dark:text-white/80">
            {badge("Nom", selected.nom)}
            {badge("Post-nom", selected.post_nom)}
            {badge("Email", selected.email)}
            {badge("Grade", selected.grade)}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Prenom</Label>
              <Input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Prenom" />
            </div>
            <div>
              <Label>Sexe</Label>
              <select
                value={sexe}
                onChange={(e) => setSexe(e.target.value)}
                className="h-[46px] w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white/80"
              >
                <option value="">Choisir</option>
                <option value="F">F</option>
                <option value="M">M</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
            <div>
              <Label>Date de naissance</Label>
              <Input type="date" value={dateNaissance} onChange={(e) => setDateNaissance(e.target.value)} />
            </div>
            <div>
              <Label>Ville</Label>
              <Input value={ville} onChange={(e) => setVille(e.target.value)} placeholder="Ville" />
            </div>
            <div>
              <Label>Pays</Label>
              <Input value={pays} onChange={(e) => setPays(e.target.value)} placeholder="Pays" />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setStep("search")}>
              Retour
            </Button>
            <Button onClick={() => setStep("securite")} disabled={!canContinueIdentite}>
              Continuer
            </Button>
          </div>
        </div>
      ) : null}

      {step === "securite" && selected ? (
        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Mot de passe</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 6 caracteres" />
            </div>
            <div>
              <Label>Confirmer le mot de passe</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-saisir" />
            </div>
            <div>
              <Label>Telephone</Label>
              <Input value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="+243..." />
            </div>
            <div>
              <Label>Commune</Label>
              <Input value={commune} onChange={(e) => setCommune(e.target.value)} placeholder="Commune" />
            </div>
            <div className="sm:col-span-2">
              <Label>Adresse</Label>
              <Input value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="Adresse complete" />
            </div>
            <div className="sm:col-span-2">
              <Label>Bio (optionnel)</Label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white/80"
                placeholder="Votre courte présentation"
              />
            </div>
            <div>
              <Label>Photo de profil (max 2MB)</Label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handlePhoto(e.target.files?.[0] ?? null)}
                className="mt-1 text-sm"
              />
              {photoDataUrl ? <p className="mt-1 text-xs text-gray-500 dark:text-white/60">Photo chargée</p> : null}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setStep("identite")}>
              Retour
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit || isPending}>
              {isPending ? "Creation en cours..." : "Creer mon compte"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
