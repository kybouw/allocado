"use client";

import { PrimaryButton } from "./PrimaryButton";

type Props = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  isPending?: boolean;
  pendingLabel?: string;
};

export function SubmitButton({
  isPending = false,
  pendingLabel = "Saving…",
  disabled,
  children,
  ...rest
}: Props) {
  return (
    <PrimaryButton type="submit" disabled={isPending || disabled} {...rest}>
      {isPending ? pendingLabel : children}
    </PrimaryButton>
  );
}
