import type { ReactNode } from "react";

const VARIANTS = {
  success: {
    container: "border-green-200 bg-green-50 text-green-800",
    icon: (
      <svg className="h-5 w-5 shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  error: {
    container: "border-red-200 bg-red-50 text-red-800",
    icon: (
      <svg className="h-5 w-5 shrink-0 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
      </svg>
    ),
  },
  info: {
    container: "border-blue-200 bg-blue-50 text-blue-800",
    icon: (
      <svg className="h-5 w-5 shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
      </svg>
    ),
  },
  warning: {
    container: "border-amber-200 bg-amber-50 text-amber-800",
    icon: (
      <svg className="h-5 w-5 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
    ),
  },
} as const;

export function Banner({
  variant,
  children,
  className,
}: {
  variant: keyof typeof VARIANTS;
  children: ReactNode;
  className?: string;
}) {
  const v = VARIANTS[variant];
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${v.container} ${className ?? ""}`}
    >
      {v.icon}
      <div className="pt-px">{children}</div>
    </div>
  );
}
