export type AccountType = "taxable" | "ira" | "roth_ira" | "401k" | "hsa" | "other";

/** Form options with full labels, in display order. */
export const ACCOUNT_TYPES: Array<{ value: AccountType; label: string }> = [
  { value: "taxable", label: "Taxable brokerage" },
  { value: "ira", label: "Traditional IRA" },
  { value: "roth_ira", label: "Roth IRA" },
  { value: "401k", label: "401(k)" },
  { value: "hsa", label: "HSA" },
  { value: "other", label: "Other" },
];

export const ACCOUNT_TYPE_VALUES: AccountType[] = ACCOUNT_TYPES.map((t) => t.value);

/** Short labels for badges. */
export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  taxable: "Taxable",
  ira: "IRA",
  roth_ira: "Roth IRA",
  "401k": "401(k)",
  hsa: "HSA",
  other: "Other",
};

export const TAX_ADVANTAGED_TYPES = new Set<string>(["ira", "roth_ira", "401k", "hsa"]);
