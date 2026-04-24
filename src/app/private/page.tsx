import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function PrivatePage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  return <p>Hello {user.emailAddresses[0]?.emailAddress}</p>;
}
