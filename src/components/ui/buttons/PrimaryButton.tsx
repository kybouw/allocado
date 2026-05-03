"use client";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function PrimaryButton({ disabled, className, children, ...rest }: Props) {
  return (
    <button
      disabled={disabled}
      className={`btn-primary disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ""}`}
      {...rest}
    >
      {children}
    </button>
  );
}
