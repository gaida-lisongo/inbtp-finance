import type { ReactNode } from "react";

type StudentResourcesLayoutProps = {
  children: ReactNode;
};

export default function StudentResourcesLayout({ children }: StudentResourcesLayoutProps) {
  return <>{children}</>;
}
