import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({
  className,
  ...props
}: InputProps) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-950",
        "placeholder:text-zinc-400",
        "outline-none transition",
        "focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100",
        "disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}