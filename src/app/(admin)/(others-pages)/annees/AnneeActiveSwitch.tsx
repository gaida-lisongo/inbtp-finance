"use client";

import { useRef } from "react";

import Switch from "@/components/form/switch/Switch";

type AnneeActiveSwitchProps = {
  anneeId: string;
  isActive: boolean;
  action: (formData: FormData) => void | Promise<void>;
};

export default function AnneeActiveSwitch({ anneeId, isActive, action }: AnneeActiveSwitchProps) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action}>
      <input type="hidden" name="id" value={anneeId} />
      <input type="hidden" name="active" value={isActive ? "false" : "true"} />
      <Switch
        label={isActive ? "Active" : "Inactive"}
        defaultChecked={isActive}
        onChange={() => formRef.current?.requestSubmit()}
      />
    </form>
  );
}
