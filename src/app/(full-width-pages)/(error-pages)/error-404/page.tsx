import ImmersiveErrorState from "@/components/common/ImmersiveErrorState";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Erreur 404",
  description: "La page demandee est introuvable dans ELMESACAD.",
};

export default function Error404() {
  return <ImmersiveErrorState code="404" title="Page introuvable" description="La ressource demandee n'existe pas ou a ete deplacee. Revenez a l'accueil ou relancez votre navigation depuis l'espace de connexion." />;
}
