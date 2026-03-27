"use client";

import { useFormStatus } from "react-dom";

import AppLoader from "@/components/common/AppLoader";

type FormSubmitButtonProps = {
  idleLabel: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  className?: string;
  form?: string;
};

const variantClasses = {
  primary: "bg-brand-500 text-white hover:bg-brand-600 disabled:bg-brand-300",
  secondary:
    "border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]",
  danger: "text-error-500 hover:text-error-600 disabled:text-error-300",
  ghost: "text-brand-500 hover:text-brand-600 disabled:text-brand-300",
};

export default function FormSubmitButton({
  idleLabel,
  pendingLabel,
  variant = "primary",
  disabled = false,
  className = "",
  form,
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;
  const label = pending ? pendingLabel || "Traitement..." : idleLabel;

  return (
    <button
      type="submit"
      form={form}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]} ${className}`}
    >
      {pending ? <AppLoader compact className="!static" label="" /> : null}
      <span>{label}</span>
    </button>
  );
}
