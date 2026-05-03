"use client";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function DestructiveButton({ disabled, className, children, ...rest }: Props) {
  return (
    <button
      disabled={disabled}
      className={`rounded-md border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ""}`}
      {...rest}
    >
      {children}
    </button>
  );
}
