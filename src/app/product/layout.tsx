import type { ReactNode } from "react";

type ProductLayoutProps = {
  children: ReactNode;
};

export default function ProductLayout({ children }: ProductLayoutProps) {
  return <>{children}</>;
}
