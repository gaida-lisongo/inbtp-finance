import ImmersiveErrorState from "@/components/common/ImmersiveErrorState";
import React from "react";

export default function NotFound() {
  return <ImmersiveErrorState code="404" title="Page introuvable" description="La route demandee ne peut pas etre resolue. Utilisez l'accueil ELMESACAD ou reconnectez-vous pour reprendre votre parcours." />;
}
