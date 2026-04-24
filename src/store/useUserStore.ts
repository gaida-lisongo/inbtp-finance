import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AgentRole } from '@/types/education';

export interface UserType {
  id: string;
  email: string;
  photo: string | null;
  nom: string | null;
  prenom: string | null;
  post_nom: string | null;
  telephone: string | null;
  role: AgentRole | null;
  sexe: string | null;
  twitter: string | null;
  facebook: string | null;
  date_naissance: Date | null;
  pays: string | null;
  ville: string | null;
  commune: string | null;
  adresse: string | null;
}

export type AccountType = "organisateur" | "gestionnaire" | "student" | "titulaire";

export type AutorisationCode = "CS" | "CE" | "CR" | "APP" | "SEC" | "T" | "J";


const AUTORISATION_LABELS: Record<string, string> = {
  CS: "Chef de Section",
  CE: "Charge de l'enseignement",
  CR: "Charge de la Recherche",
  APP: "Appariteur",
  SEC: "Secretaire",
  T: "Titulaire",
  J: "Jury",
};

const KNOWN_CODES = new Set(["CS", "CE", "CR", "APP", "SEC", "T", "J"]);
export async function normalizeAutorisationCode(value: string | null | undefined): Promise<AutorisationCode | null> {
  if (!value) return null;
  const normalizedValue = value.trim().toUpperCase();
  return KNOWN_CODES.has(normalizedValue) ? (normalizedValue as AutorisationCode) : null;
}

interface UserState {
  accountType: AccountType | null;
  profile: UserType | null;
  codes: {code: AutorisationCode, designation: string}[];
  permissions: {
    canManageAdmin: boolean;
    canManageStudents: boolean;
    canManageCharges: boolean;
    canManageYears: boolean;
    canManageAuthorizations: boolean;
    canManageFiliere: boolean;
    canManageProgramme: boolean;
  } | null;
  isLoading: boolean;
  setProfile: (data: any) => Promise<void>; // Changé en n'importe quel objet venant de la DB
  setPermissions: (permissions: any) => void;
  setCodes: () => Promise<void>;
  setAccountType: (role: string | null) => void;
  syncProfile: (payload: Partial<UserType>) => Promise<void>;
  syncPhoto: (formData: FormData) => Promise<void>;
  getTable: () => string;
  logout: () => Promise<boolean>;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      accountType: null,
      profile: null,
      codes: [],
      permissions: null,
      isLoading: false, // Initialisé à false, passé à true pendant les actions

      setAccountType: (role: string | null) => {
        const accountType = !role ? "student" : (role as AccountType);
        set({ accountType });
      },

      setCodes: async () => {
        try {
          const res = await fetch(`/api/user?agentId=${get().profile?.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
          })
          
          if(!res.ok) throw new Error('Failed to sync codes');

          const { data } = await res.json();
          const codes = data.map((row: {id: string, code: AutorisationCode, agent_id: string, is_active: 'oui' | 'non'}) => {
            if(row.is_active === 'oui') {
              return {
                code: row.code,
                designation: AUTORISATION_LABELS[row.code],
              }
            }
            return null;
          }).filter((row: any) => row !== null);
          console.log("codes", codes);
          set({ codes })
          
        } catch (error) {
          console.error("Error syncing codes:", error);
          throw error;
        }
      },

      setProfile: async (user: any) => {
        if (!user) return;
        set({ isLoading: true });
        try {
          set({
            profile: {
              id: user.agentId || user.id, // Supporte les deux formats
              email: user.email,
              photo: user.photo,
              nom: user.nom,
              prenom: user.prenom,
              post_nom: user.post_nom,
              telephone: user.telephone,
              role: user.role,
              sexe: user.sexe,
              twitter: user.twitter,
              facebook: user.facebook,
              date_naissance: user.date_naissance,
              pays: user.pays,
              ville: user.ville,
              commune: user.commune,
              adresse: user.adresse,
            },
          });
        } finally {
          set({ isLoading: false });
        }
      },

      setPermissions: (role: string | null) => {
        set({
          permissions: {
            canManageAdmin: role != 'titulaire' || !role ? true : false ,
            canManageYears: role == 'organisateur' && role ? true : false,
            canManageAuthorizations: role == 'organisateur' && role ? true : false,
            canManageStudents: role == 'gestionnaire' && role ? true : false,
            canManageFiliere: role == 'gestionnaire' && role ? true : false,
            canManageProgramme: role == 'gestionnaire' && role ? true : false,
            canManageCharges: role == 'titulaire' && role ? true : false,
          },
        });
      },

      getTable: () => {
        return get().accountType === 'student' ? 'students' : 'agents';
      },

      syncProfile: async (payload: Partial<UserType>) => {
        const currentProfile = get().profile;
        if (!currentProfile) return;

        try {
          const currentTable = get().getTable();
          const req = await fetch(`/api/user?table=${currentTable}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              payload: payload,
              id: currentProfile.id
            })
          });

          if (!req.ok) throw new Error('Failed to sync profile');
          
          const { data } = await req.json();

          // Correction Type : On fusionne proprement
          set((state) => ({
            profile: state.profile ? { ...state.profile, ...data } : null
          }));

        } catch (error) {
          console.error("Error syncing profile:", error);
          throw error;
        }
      },

      syncPhoto: async (formData: FormData) => {
        const id = get().profile?.id;
        if (!id) return;

        try {
          const currentTable = get().getTable();
          const req = await fetch(`/api/user?table=${currentTable}&id=${id}`, {
            method: 'POST',
            body: formData
          });

          if (!req.ok) throw new Error('Failed to sync photo');

          const { photoUrl } = await req.json();
          
          set((state) => ({
            profile: state.profile ? { ...state.profile, photo: photoUrl } : null
          }));
        } catch (error) {
          console.error("Error syncing photo:", error);
          throw error;
        }
      },

      logout: async () => {
        try {
          const req = await fetch("/api/auth", { method: "DELETE" });
          if (req.ok) {
            set({ profile: null, accountType: null, permissions: null, codes: [] });
            return true;
          }
          return false;
        } catch (error) {
          console.error("Erreur déconnexion:", error);
          return false;
        }
      },
    }),
    {
      name: 'elmesacad-user-storage',
      storage: createJSONStorage(() => localStorage),
      // Nettoyage de partialize (on enlève rawUser qui n'existe pas)
      partialize: (state) => ({
        accountType: state.accountType,
        profile: state.profile,
        permissions: state.permissions,
        codes: state.codes
      }),
    }
  )
);