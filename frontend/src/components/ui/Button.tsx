import type {
  ButtonHTMLAttributes,
  ReactNode,
} from 'react';

type ButtonProps =
  ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
    fullWidth?: boolean;
  };

export function Button({
  children,
  fullWidth = false,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center
        rounded-xl
        bg-slate-950
        px-5 py-3
        text-sm font-medium text-white
        transition
        hover:bg-slate-800
        focus:outline-none
        focus:ring-2
        focus:ring-slate-950
        focus:ring-offset-2
        disabled:cursor-not-allowed
        disabled:opacity-50
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}