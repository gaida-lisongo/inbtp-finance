# CONTEXT

## Objectif actuel

Ce projet entre dans une phase de refactoring UI. Avant toute évolution visuelle, il faut préserver la structure métier déjà en place et éviter les modifications qui cassent les flux existants entre pages, composants, actions serveur et services Supabase.

## Règle de travail importante

Ne pas lancer de rebuild global pendant cette phase de développement, sauf demande explicite de l'utilisateur.

Concrètement:
- ne pas exécuter `npm run build` par défaut
- ne pas faire de "rebuild" comme étape automatique de fin de tâche
- privilégier la lecture du code, les changements ciblés et les validations légères
- si une validation plus lourde est nécessaire, demander ou signaler explicitement avant de la lancer

## Stack technique

- Next.js 16 avec App Router
- React 19
- TypeScript strict
- Tailwind CSS v4
- Supabase pour auth, data et storage
- Dashboard TailAdmin comme base visuelle historique

## Organisation générale

### `src/app`

Le routing suit App Router avec plusieurs groupes:

- `(admin)`:
  espace principal authentifié, avec shell dashboard, sidebar, header et pages métier
- `(full-width-pages)`:
  pages auth, erreurs et pages plus isolées du shell dashboard
- `checking`, `commande`, `paiement`, `product`:
  flux applicatifs spécialisés hors simple dashboard
- `api`:
  endpoints route handlers
- `actions`:
  server actions transverses

Le layout racine charge:
- `ThemeProvider`
- `SidebarProvider`

Le layout admin:
- récupère l'utilisateur authentifié
- construit dynamiquement le menu sidebar
- injecte les snapshots de notifications
- enveloppe le tout dans `AdminShell`

### `src/layout`

Le shell visuel principal est composé de:

- `AdminShell.tsx`
- `AppSidebar.tsx`
- `AppHeader.tsx`
- `Backdrop.tsx`

Le refactoring UI devra probablement passer en priorité par ces fichiers, car ils structurent toute l'expérience dashboard.

### `src/components`

Le dossier contient à la fois:

- des primitives UI réutilisables (`src/components/ui`)
- des composants communs de structure (`src/components/common`)
- des composants métier par domaine:
  `education`, `student`, `teacher`, `retraits`, `recherche`, `commande`, `paiement`, `jury`, etc.

Le projet mélange donc:
- composants purement visuels
- composants de composition métier
- composants interactifs côté client

Pour un refactoring UI propre, il faut distinguer ces trois niveaux au lieu de tout traiter comme une seule couche.

### `src/lib/utils/supabase`

Cette zone contient l'essentiel de la logique d'accès aux données et des agrégations métier:

- auth/session
- récupération des tableaux de bord
- commandes
- documents
- parcours
- enseignement
- retraits
- recherche
- notifications

La plupart des pages serveur appellent ces services, puis passent des snapshots prêts à afficher à des composants React.

### `src/utils`

Les utilitaires spécialisés actuellement présents:

- `pdf`
- `excel`
- `mail`

Le nouveau système mail est désormais dans `src/utils/mail`.

## Flux architectural dominant

Le pattern dominant du projet est le suivant:

1. une page `src/app/.../page.tsx` côté serveur récupère l'utilisateur et les données
2. elle appelle des services depuis `src/lib/utils/supabase`
3. elle passe ensuite un snapshot ou des props à un composant React
4. les composants client gèrent filtres, interactions locales, transitions et affichage

C'est déjà visible sur:

- le dashboard principal
- les workspaces étudiant
- les panneaux organisateur
- les pages de commande

Ce pattern est bon pour le refactoring UI, car il permet de refaire l'interface sans réécrire toute la logique métier.

## Gestion des rôles et navigation

La navigation n'est pas statique.

Le menu de sidebar est construit par `src/lib/navigation/admin-sidebar.ts` selon:

- la persona active
- le rôle agent
- les autorisations métier
- les programmes disponibles

Les personas principales sont:

- `admin`
- `teacher`
- `student`

Le refactoring UI ne doit donc pas supposer une navigation identique pour tout le monde.

## Conventions observées dans le code actuel

- les pages App Router restent assez fines et délèguent la logique
- beaucoup de composants métier importants sont des composants client
- les layouts et dashboards utilisent largement Tailwind inline
- plusieurs blocs visuels sont déjà factorisés:
  `ComponentCard`, `MetricTile`, tables UI, boutons UI, modals UI
- le projet conserve encore des traces historiques TailAdmin dans les styles et la structure

## Zones prioritaires pour le refactoring UI

### 1. Shell global

Fichiers clés:

- `src/layout/AdminShell.tsx`
- `src/layout/AppSidebar.tsx`
- `src/layout/AppHeader.tsx`

Impact:
- navigation
- densité visuelle
- responsive
- hiérarchie des écrans

### 2. Composants communs de surface

Fichiers clés:

- `src/components/common/ComponentCard.tsx`
- `src/components/common/PageBreadCrumb.tsx`
- `src/components/common/DataTable.tsx`
- `src/components/ui/button/Button.tsx`
- `src/components/ui/table/index.tsx`
- `src/components/ui/modal/index.tsx`

Impact:
- cohérence générale des pages
- réduction de duplication visuelle

### 3. Dashboards métier

Fichiers clés:

- `src/components/education/*`
- `src/components/student/*`
- `src/components/teacher/*`

Impact:
- cartes
- métriques
- listes
- densité d'information

## Points de vigilance

- ne pas déplacer brutalement la logique métier hors de `src/lib/utils/supabase` sans besoin clair
- ne pas casser les pages serveur qui dépendent de snapshots typés
- ne pas introduire de nouvelle abstraction UI trop tôt si une primitive existante peut être étendue
- préserver les différences entre dashboard admin, étudiant et enseignant
- garder les composants route-level relativement fins

## Dette ou héritage à connaître

- le projet contient encore des éléments Microsoft 365 historiques non liés directement au mail
- certains composants sont très orientés métier et embarquent à la fois affichage, filtrage et interactions
- les classes utilitaires PDF/Excel suivent une logique orientée document et non une architecture UI
- certaines pages portent encore fortement l'empreinte TailAdmin d'origine

## Recommandation pour les prochaines tâches UI

Approche recommandée:

1. analyser la zone visée
2. identifier les primitives déjà utilisées localement
3. faire un changement visuel ciblé sans refonte métier
4. préserver les props et contrats existants autant que possible
5. éviter les rebuilds globaux tant que l'utilisateur est en phase de développement

## Résumé opérationnel

Le projet est déjà structuré de manière exploitable pour un refactoring UI:

- App Router pour l'entrée par pages
- shell dashboard centralisé
- logique data majoritairement dans `src/lib/utils/supabase`
- composants métier consommant des snapshots prêts à afficher

La bonne stratégie est donc un refactoring progressif par couches visuelles, pas une réécriture large de l'architecture.
