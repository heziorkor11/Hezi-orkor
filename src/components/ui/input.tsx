import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-md border border-line-strong bg-paper px-3 text-sm text-fg outline-none",
        "placeholder:text-subtle focus:border-accent-hot focus:ring-2 focus:ring-accent/30",
        className,
      )}
      {...props}
    />
  );
}
