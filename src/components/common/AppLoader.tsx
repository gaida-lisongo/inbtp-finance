"use client";

type AppLoaderProps = {
  label?: string;
  fullscreen?: boolean;
  overlay?: boolean;
  compact?: boolean;
  className?: string;
};

export default function AppLoader({
  label = "Chargement en cours...",
  fullscreen = false,
  overlay = false,
  compact = false,
  className = "",
}: AppLoaderProps) {
  const wrapperClassName = fullscreen
    ? "fixed inset-0 z-99999 flex min-h-screen items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-gray-900/80"
    : overlay
      ? "absolute inset-0 z-50 flex items-center justify-center rounded-2xl bg-white/75 backdrop-blur-sm dark:bg-gray-900/75"
      : "flex items-center justify-center";

  return (
    <div className={`${wrapperClassName} ${className}`}>
      <div className="flex flex-col items-center gap-3">
        <span className={`relative inline-flex items-center justify-center ${compact ? "size-4" : "size-12"}`}>
          <span
            className={`absolute inline-flex animate-ping rounded-full bg-brand-200/70 dark:bg-brand-500/20 ${
              compact ? "size-4" : "size-12"
            }`}
          />
          <span
            className={`inline-flex animate-spin rounded-full border-brand-200 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400 ${
              compact ? "size-4 border-2" : "size-12 border-4"
            }`}
          />
        </span>
        {label ? <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p> : null}
      </div>
    </div>
  );
}
