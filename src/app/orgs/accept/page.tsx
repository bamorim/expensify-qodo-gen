"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "~/trpc/react";

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [error, setError] = useState<string | null>(null);

  const acceptInvite = api.invitation.accept.useMutation({
    onSuccess: () => {
      // Redirect to organizations page after successful acceptance
      setTimeout(() => {
        router.push("/orgs");
      }, 2000);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  useEffect(() => {
    if (token && !acceptInvite.isPending && !acceptInvite.isSuccess && !error) {
      acceptInvite.mutate({ token });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h1 className="mb-2 text-2xl font-bold text-red-800">Invalid Link</h1>
          <p className="text-red-700">
            No invitation token found. Please check your invitation link.
          </p>
        </div>
      </main>
    );
  }

  if (acceptInvite.isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-lg border p-6 text-center">
          <div className="mb-4 flex justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
          </div>
          <h1 className="mb-2 text-2xl font-bold">Accepting Invitation...</h1>
          <p className="text-gray-600">Please wait while we process your invitation.</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h1 className="mb-2 text-2xl font-bold text-red-800">Error</h1>
          <p className="mb-4 text-red-700">{error}</p>
          <button
            onClick={() => router.push("/orgs")}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Go to Organizations
          </button>
        </div>
      </main>
    );
  }

  if (acceptInvite.isSuccess) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-lg border border-green-200 bg-green-50 p-6 text-center">
          <div className="mb-4 flex justify-center">
            <svg
              className="h-16 w-16 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-green-800">
            Invitation Accepted!
          </h1>
          <p className="mb-4 text-green-700">
            You have successfully joined {acceptInvite.data.org.name}.
          </p>
          <p className="text-sm text-gray-600">
            Redirecting to organizations page...
          </p>
        </div>
      </main>
    );
  }

  return null;
}
