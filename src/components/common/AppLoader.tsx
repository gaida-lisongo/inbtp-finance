import React from "react";

type AppLoaderProps = {
  message: string;
  fullscreen?: boolean;
  compact?: boolean;
};

export default function AppLoader({
  message,
  fullscreen = false,
  compact = false,
}: AppLoaderProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 ${
        fullscreen ? "min-h-[280px]" : compact ? "py-4" : "py-10"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute h-16 w-16 rounded-full border border-brand-200 dark:border-brand-500/20" />
        <span className="absolute h-16 w-16 animate-ping rounded-full bg-brand-500/10" />
        <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-brand-200 border-t-brand-500 dark:border-brand-500/20 dark:border-t-brand-400" />
        <span className="absolute h-3 w-3 rounded-full bg-brand-500 dark:bg-brand-400" />
      </div>

      <div className="space-y-1 text-center">
        <p className="text-sm font-medium text-gray-800 dark:text-white/90">{message}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Veuillez patienter...</p>
      </div>
    </div>
  );
}
