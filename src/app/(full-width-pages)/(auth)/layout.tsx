import AuthShowcasePanel from "@/components/auth/AuthShowcasePanel";
import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f3f1ec] dark:bg-[#1b1c1b]">
      <div className="relative flex min-h-screen flex-col lg:flex-row">
        {children}
        <AuthShowcasePanel />
        <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
          <ThemeTogglerTwo />
        </div>
      </div>
    </div>
  );
}
