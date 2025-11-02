import { createClient } from "@/utils/supabase/server";

export default async function Accounts() {
  const supabase = await createClient();
  const { data: accounts, error } = await supabase.from("accounts").select();

  if (error) console.debug(error);

  return <pre>{JSON.stringify(accounts, null, 2)}</pre>;
}
