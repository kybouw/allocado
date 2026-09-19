"use client";

import { ACCOUNT_TYPES } from "@allocado/lib/account-types";

export type AccountFormValues = {
  id: string;
  name: string;
  goalId: string;
  accountType: string;
  institution: string | null;
  minimumCashBalance: string | null;
  notes: string | null;
};

/**
 * The account field set, shared by the create/edit dialog on /accounts and the
 * General tab of the account detail dialog. Field names match what
 * createAccount/updateAccount read off the FormData.
 *
 * `idPrefix` keeps label/input ids unique when more than one of these is mounted.
 */
export function AccountGeneralForm({
  account,
  goals,
  idPrefix = "account",
}: {
  account?: AccountFormValues;
  goals: Array<{ id: string; name: string }>;
  idPrefix?: string;
}) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-name`} className="text-sm font-medium text-avocado-700">
          Name
        </label>
        <input
          id={`${idPrefix}-name`}
          name="name"
          type="text"
          required
          placeholder="Vanguard Roth IRA"
          defaultValue={account?.name ?? ""}
          className="input-field"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-goal`} className="text-sm font-medium text-avocado-700">
          Goal
        </label>
        <select
          id={`${idPrefix}-goal`}
          name="goalId"
          required
          defaultValue={account?.goalId}
          className="input-field"
        >
          {goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-type`} className="text-sm font-medium text-avocado-700">
          Type
        </label>
        <select
          id={`${idPrefix}-type`}
          name="accountType"
          required
          defaultValue={account?.accountType}
          className="input-field"
        >
          {ACCOUNT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-institution`} className="text-sm font-medium text-avocado-700">
          Institution
        </label>
        <input
          id={`${idPrefix}-institution`}
          name="institution"
          type="text"
          placeholder="Vanguard"
          defaultValue={account?.institution ?? ""}
          className="input-field"
        />
      </div>

      <div className="flex flex-col gap-1 sm:col-span-2">
        <label htmlFor={`${idPrefix}-min-cash`} className="text-sm font-medium text-avocado-700">
          Required cash balance
        </label>
        <input
          id={`${idPrefix}-min-cash`}
          name="minimumCashBalance"
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          placeholder="e.g. 2000"
          defaultValue={account?.minimumCashBalance ?? ""}
          className="input-field"
        />
        <p className="text-xs text-avocado-600">
          Cash this account forces you to keep — an HSA debit-card floor, for example. Leave blank
          if there is no requirement.
        </p>
      </div>

      <div className="flex flex-col gap-1 sm:col-span-2">
        <label htmlFor={`${idPrefix}-notes`} className="text-sm font-medium text-avocado-700">
          Notes
        </label>
        <input
          id={`${idPrefix}-notes`}
          name="notes"
          type="text"
          defaultValue={account?.notes ?? ""}
          className="input-field"
        />
      </div>
    </>
  );
}
