import type { Metadata } from "next";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import MailAccountsCrudPanel from "@/components/mail/MailAccountsCrudPanel";

export const metadata: Metadata = {
  title: "Mail Accounts CRUD | Dashboard Agents",
  description: "Page publique de test CRUD pour les utilisateurs mail.",
};

export default function MailAccountsPage() {
  return (
    <div className="p-6 md:p-10 xl:p-15">
      <PageBreadcrumb pageTitle="Mail Accounts" />
      <MailAccountsCrudPanel />
    </div>
  );
}
