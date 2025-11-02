import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import PoliciesPageClient from "./_components/policies-page-client";

export default async function PoliciesPage({
  params,
}: {
  params: { orgId: string };
}) {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  // Prefetch data for SSR
  await api.org.get.prefetch({ orgId: params.orgId });
  await api.policy.list.prefetch({ orgId: params.orgId });
  await api.category.list.prefetch({ orgId: params.orgId });
  await api.membership.list.prefetch({ orgId: params.orgId });

  return (
    <HydrateClient>
      <PoliciesPageClient orgId={params.orgId} />
    </HydrateClient>
  );
}
