"use client";

import { useRouter } from "next/navigation";
import clsx from "clsx";

/** Show a short confirmation message at the bottom of the screen. Works from anywhere. */
export function toast(message: string, tone: "ok" | "info" = "ok") {
  window.dispatchEvent(new CustomEvent("app-toast", { detail: { message, tone } }));
}

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  /** Navigate here on click. */
  href?: string;
  /** Confirmation shown on click. */
  toast?: string;
};

/**
 * Every button does something: runs onClick, opens a page, or confirms the action.
 * Actions that would contact a real person (send email/WhatsApp) are simulated in this demo and say so.
 */
export function Button({ variant = "primary", className, children, href, toast: toastMsg, onClick, ...rest }: Props) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={(e) => {
        onClick?.(e);
        if (href) router.push(href);
        if (toastMsg) toast(toastMsg);
        else if (!onClick && !href) toast(`${e.currentTarget.textContent?.trim()}: done (simulated in this demo)`, "info");
      }}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors disabled:opacity-50",
        variant === "primary" && "bg-purple text-white hover:bg-[#1f6fd8]",
        variant === "secondary" && "border border-purple/60 bg-white text-purple hover:bg-tint",
        variant === "ghost" && "text-purple hover:bg-tint",
        variant === "danger" && "border border-bad/30 bg-white text-bad hover:bg-bad-bg",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
