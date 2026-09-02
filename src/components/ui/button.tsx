import type { ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-[filter,transform,background-color,border-color] duration-150 ease-out select-none disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-hot/70",
  {
    variants: {
      variant: {
        primary: "bg-fg text-ink hover:brightness-95",
        accent: "bg-accent text-fg hover:bg-accent-hot",
        ghost:
          "bg-elevated text-fg-soft border border-line-strong hover:border-accent hover:text-fg",
        outline:
          "border border-line-strong bg-transparent text-fg-soft hover:border-accent hover:text-fg",
        whatsapp: "bg-whatsapp text-ink hover:brightness-110",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-4 text-sm",
        lg: "h-12 px-5 text-base",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return (
    <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}

export { buttonVariants };
