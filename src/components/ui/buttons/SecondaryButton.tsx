"use client";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function SecondaryButton({ disabled, className, children, ...rest }: Props) {
  return (
    <button
      disabled={disabled}
      className={`btn-secondary disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ""}`}
      {...rest}
    >
      {children}
    </button>
  );
}
