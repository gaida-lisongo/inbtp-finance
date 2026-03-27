"use client";

import { useEffect, useState } from "react";

import AppLoader from "@/components/common/AppLoader";

type AsyncProgressButtonProps<T> = {
  action: () => Promise<T>;
  idleLabel: string;
  progressMessages: string[];
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
  className?: string;
};

export default function AsyncProgressButton<T>({
  action,
  idleLabel,
  progressMessages,
  onSuccess,
  onError,
  disabled = false,
  className = "",
}: AsyncProgressButtonProps<T>) {
  const [pending, setPending] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!pending || progressMessages.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % progressMessages.length);
    }, 1200);

    return () => window.clearInterval(interval);
  }, [pending, progressMessages]);

  const handleClick = async () => {
    if (pending || disabled) {
      return;
    }

    setPending(true);
    setMessageIndex(0);

    try {
      const result = await action();
      onSuccess?.(result);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("Une erreur inconnue est survenue."));
    } finally {
      setPending(false);
      setMessageIndex(0);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending || disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {pending ? <AppLoader compact className="!static" label="" /> : null}
      <span>{pending ? progressMessages[messageIndex] || idleLabel : idleLabel}</span>
    </button>
  );
}
