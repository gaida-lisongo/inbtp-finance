import { autorisationLabels, getActiveAutorisationCodesForAgent, type AutorisationCode } from "@/lib/utils/supabase/autorisations";
import { getProgrammes } from "@/lib/utils/supabase/programmes";
import type { AuthenticatedUser } from "@/lib/utils/supabase/session";

export type SidebarMenuSubItem = {
  name: string;
  path: string;
};

export type SidebarMenuItem = {
  name: string;
  path?: string;
  iconKey: "grid" | "folder" | "group" | "user";
  subItems?: SidebarMenuSubItem[];
};

const buildProgrammeSubItems = async () => {
  const programmes = await getProgrammes();

  return programmes.map((programme) => ({
    name: programme.designation || "Programme sans designation",
    path: `/classes/${programme.id}`,
  }));
};

export const getAdminSidebarMenu = async (user: AuthenticatedUser): Promise<SidebarMenuItem[]> => {
  const items: SidebarMenuItem[] = [
    {
      name: "Dashboard",
      path: "/",
      iconKey: "grid",
    },
  ];

  if (!user.agentId) {
    return items;
  }

  const [autorisationCodes, programmeSubItems] = await Promise.all([
    getActiveAutorisationCodesForAgent(user.agentId),
    buildProgrammeSubItems(),
  ]);

  for (const code of autorisationCodes) {
    items.push({
      name: autorisationLabels[code as AutorisationCode],
      iconKey: "folder",
      subItems: programmeSubItems,
    });
  }

  items.push({
    name: "Profil",
    path: "/profile",
    iconKey: "user",
  });

  return items;
};
