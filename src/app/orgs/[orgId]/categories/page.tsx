import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import CategoriesPageClient from "./_components/categories-page-client";

export default async function CategoriesPage({
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
  await api.category.list.prefetch({ orgId: params.orgId });

  return (
    <HydrateClient>
      <CategoriesPageClient orgId={params.orgId} />
    </HydrateClient>
  );
}
