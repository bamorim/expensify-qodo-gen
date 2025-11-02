import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import OrgsPageClient from "./_components/orgs-page-client";
import { api, HydrateClient } from "~/trpc/server";

export default async function OrgsPage() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  await api.org.list.prefetch()
  

  return <HydrateClient>
    <OrgsPageClient />
  </HydrateClient>;
}

  