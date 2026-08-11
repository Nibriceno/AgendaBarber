import type {
  InputHTMLAttributes,
} from 'react';

type InputProps =
  InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    error?: string;
  };

export function Input({
  label,
  error,
  id,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-slate-700"
      >
        {label}
      </label>

      <input
        id={id}
        className={`
          w-full
          rounded-xl
          border border-slate-200
          bg-white
          px-4 py-3
          text-sm text-slate-950
          outline-none
          transition
          placeholder:text-slate-400
          focus:border-slate-400
          focus:ring-4
          focus:ring-slate-100
          ${error ? 'border-red-400' : ''}
          ${className}
        `}
        {...props}
      />

      {error && (
        <p className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}