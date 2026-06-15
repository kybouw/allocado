"use client";

import { Button } from "@allocado/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@allocado/components/ui/tooltip";
import { Delete } from "lucide-react";

export function RemoveRowButton({
  onClick,
  label = "Remove row",
  className,
}: {
  onClick: () => void;
  label?: string;
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
          aria-label={label}
          className={`border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 ${className ?? ""}`}
        >
          <Delete className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
