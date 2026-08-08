"use client";

import { Button } from "@allocado/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@allocado/components/ui/tooltip";
import { Unlink } from "lucide-react";

export function UnlinkRowButton({
  onClick,
  label = "Detach from sync",
  disabled,
  className,
}: {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          className={`border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 ${className ?? ""}`}
        >
          <Unlink className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
