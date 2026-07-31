export type TypeName = "Stocks" | "Bonds" | "Cash" | "Other";
export type TypeKey = "stock" | "bond" | "cash" | "other";

export const ALL_TYPE_KEYS = ["stock", "bond", "cash", "other"] as const satisfies TypeKey[];

export const TYPE_DISPLAY: Record<TypeKey, TypeName> = {
  stock: "Stocks",
  bond: "Bonds",
  cash: "Cash",
  other: "Other",
};

export const TYPE_COLORS: Record<TypeName, string> = {
  Stocks: "bg-avocado-500",
  Bonds: "bg-coin",
  Cash: "bg-avocado-200",
  Other: "bg-purple-300",
};

export const ROW_H = "h-9";

export type AllocationSlice = { name: TypeName; current: number; target: number };

export type AccountBreakdown = {
  accountId: string;
  accountName: string;
  accountType: string;
  total: string;
  targeted: AllocationSlice[];
};
