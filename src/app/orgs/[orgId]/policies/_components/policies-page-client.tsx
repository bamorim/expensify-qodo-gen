"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Role, ReviewMode } from "@prisma/client";
import Link from "next/link";

export default function PoliciesPageClient({ orgId }: { orgId: string }) {
  const [newPolicyName, setNewPolicyName] = useState("");
  const [newPolicyDescription, setNewPolicyDescription] = useState("");
  const [newPolicyCategoryId, setNewPolicyCategoryId] = useState<string>("");
  const [newPolicyUserId, setNewPolicyUserId] = useState<string>("");
  const [newPolicyMaxAmount, setNewPolicyMaxAmount] = useState("");
  const [newPolicyReviewMode, setNewPolicyReviewMode] = useState<ReviewMode>(
    ReviewMode.MANUAL_REVIEW,
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editMaxAmount, setEditMaxAmount] = useState("");
  const [editReviewMode, setEditReviewMode] = useState<ReviewMode>(
    ReviewMode.MANUAL_REVIEW,
  );

  // Debug state
  const [debugUserId, setDebugUserId] = useState<string>("");
  const [debugCategoryId, setDebugCategoryId] = useState<string>("");

  const utils = api.useUtils();

  // Queries
  const { data: orgData } = api.org.get.useQuery({ orgId });
  const { data: policies, isLoading } = api.policy.list.useQuery({ orgId });
  const { data: categories } = api.category.list.useQuery({ orgId });
  const { data: members } = api.membership.list.useQuery({ orgId });

  // Debug query - only runs when both orgId and debugUserId are set
  const { data: debugResult, isLoading: isResolving } =
    api.policy.resolve.useQuery(
      {
        orgId,
        userId: debugUserId,
        categoryId: debugCategoryId || undefined,
      },
      {
        enabled: !!debugUserId,
      },
    );

  const isAdmin = orgData?.role === Role.ADMIN;

  // Mutations
  const createPolicy = api.policy.create.useMutation({
    onSuccess: () => {
      setNewPolicyName("");
      setNewPolicyDescription("");
      setNewPolicyCategoryId("");
      setNewPolicyUserId("");
      setNewPolicyMaxAmount("");
      setNewPolicyReviewMode(ReviewMode.MANUAL_REVIEW);
      void utils.policy.list.invalidate();
    },
  });

  const updatePolicy = api.policy.update.useMutation({
    onSuccess: () => {
      setEditingId(null);
      void utils.policy.list.invalidate();
    },
  });

  const deletePolicy = api.policy.delete.useMutation({
    onSuccess: () => {
      void utils.policy.list.invalidate();
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const maxAmount = parseFloat(newPolicyMaxAmount);
    if (newPolicyName.trim() && !isNaN(maxAmount) && maxAmount > 0) {
      createPolicy.mutate({
        orgId,
        name: newPolicyName,
        description: newPolicyDescription || undefined,
        categoryId: newPolicyCategoryId || undefined,
        userId: newPolicyUserId || undefined,
        maxAmount,
        reviewMode: newPolicyReviewMode,
      });
    }
  };

  const handleUpdate = (id: string) => {
    const maxAmount = parseFloat(editMaxAmount);
    if (editName.trim() && !isNaN(maxAmount) && maxAmount > 0) {
      updatePolicy.mutate({
        id,
        name: editName,
        description: editDescription || null,
        maxAmount,
        reviewMode: editReviewMode,
      });
    }
  };

  const startEdit = (policy: {
    id: string;
    name: string;
    description: string | null;
    maxAmount: string;
    reviewMode: ReviewMode;
  }) => {
    setEditingId(policy.id);
    setEditName(policy.name);
    setEditDescription(policy.description ?? "");
    setEditMaxAmount(policy.maxAmount);
    setEditReviewMode(policy.reviewMode);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditDescription("");
    setEditMaxAmount("");
    setEditReviewMode(ReviewMode.MANUAL_REVIEW);
  };

  const getPolicyScope = (policy: {
    categoryId: string | null;
    userId: string | null;
  }) => {
    if (policy.userId && policy.categoryId) return "User + Category";
    if (policy.categoryId) return "Org + Category";
    if (policy.userId) return "User-wide";
    return "Org-wide";
  };

  const resetDebug = () => {
    setDebugUserId("");
    setDebugCategoryId("");
  };

  if (isLoading) {
    return (
      <main className="p-6">
        <p>Loading policies...</p>
      </main>
    );
  }

  if (!orgData) {
    return (
      <main className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">
            You are not a member of this organization.
          </p>
          <Link href="/orgs" className="text-blue-600 hover:underline">
            Back to Organizations
          </Link>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="p-6">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-yellow-800">
            Only admins can manage policies.
          </p>
          <Link href="/orgs" className="text-blue-600 hover:underline">
            Back to Organizations
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Policies</h1>
          <p className="text-gray-600">{orgData.org.name}</p>
        </div>
        <Link
          href="/orgs"
          className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
        >
          Back to Organizations
        </Link>
      </div>

      {/* Create Policy */}
      <section className="mb-8 rounded-lg border p-4">
        <h2 className="mb-4 text-xl font-semibold">Create Policy</h2>
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Policy Name *
              </label>
              <input
                type="text"
                value={newPolicyName}
                onChange={(e) => setNewPolicyName(e.target.value)}
                placeholder="e.g., Standard Travel Policy"
                className="w-full rounded border px-3 py-2"
                disabled={createPolicy.isPending}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Max Amount ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newPolicyMaxAmount}
                onChange={(e) => setNewPolicyMaxAmount(e.target.value)}
                placeholder="100.00"
                className="w-full rounded border px-3 py-2"
                disabled={createPolicy.isPending}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Description
            </label>
            <textarea
              value={newPolicyDescription}
              onChange={(e) => setNewPolicyDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full rounded border px-3 py-2"
              rows={2}
              disabled={createPolicy.isPending}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Category (optional)
              </label>
              <select
                value={newPolicyCategoryId}
                onChange={(e) => setNewPolicyCategoryId(e.target.value)}
                className="w-full rounded border px-3 py-2"
                disabled={createPolicy.isPending}
              >
                <option value="">All Categories</option>
                {categories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                User (optional)
              </label>
              <select
                value={newPolicyUserId}
                onChange={(e) => setNewPolicyUserId(e.target.value)}
                className="w-full rounded border px-3 py-2"
                disabled={createPolicy.isPending}
              >
                <option value="">All Users</option>
                {members?.map((member) => (
                  <option key={member.user.id} value={member.user.id}>
                    {member.user.name ?? member.user.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Review Mode
              </label>
              <select
                value={newPolicyReviewMode}
                onChange={(e) =>
                  setNewPolicyReviewMode(e.target.value as ReviewMode)
                }
                className="w-full rounded border px-3 py-2"
                disabled={createPolicy.isPending}
              >
                <option value={ReviewMode.MANUAL_REVIEW}>Manual Review</option>
                <option value={ReviewMode.AUTO_APPROVE}>Auto-Approve</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={
              createPolicy.isPending ||
              !newPolicyName.trim() ||
              !newPolicyMaxAmount
            }
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
          >
            {createPolicy.isPending ? "Creating..." : "Create Policy"}
          </button>

          {createPolicy.error && (
            <p className="text-sm text-red-600">
              {createPolicy.error.message}
            </p>
          )}
        </form>
      </section>

      {/* Policy Resolution Debugger */}
      <section className="mb-8 rounded-lg border border-purple-200 bg-purple-50 p-4">
        <h2 className="mb-4 text-xl font-semibold text-purple-900">
          🔍 Policy Resolution Debugger
        </h2>
        <p className="mb-4 text-sm text-purple-700">
          Test how policies are resolved for different user/category
          combinations.
        </p>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-purple-900">
                User *
              </label>
              <select
                value={debugUserId}
                onChange={(e) => setDebugUserId(e.target.value)}
                className="w-full rounded border px-3 py-2"
                disabled={isResolving}
              >
                <option value="">Select a user</option>
                {members?.map((member) => (
                  <option key={member.user.id} value={member.user.id}>
                    {member.user.name ?? member.user.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-purple-900">
                Category (optional)
              </label>
              <select
                value={debugCategoryId}
                onChange={(e) => setDebugCategoryId(e.target.value)}
                className="w-full rounded border px-3 py-2"
                disabled={isResolving}
              >
                <option value="">No specific category</option>
                {categories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {debugUserId && (
            <div className="flex gap-2">
              {isResolving && (
                <p className="text-sm text-purple-700">Resolving...</p>
              )}
              <button
                type="button"
                onClick={resetDebug}
                className="rounded bg-gray-300 px-4 py-2 hover:bg-gray-400"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Debug Results */}
        {debugResult && (
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-purple-300 bg-white p-4">
              <h3 className="mb-2 font-semibold text-purple-900">
                Selected Policy
              </h3>
              {debugResult.policy ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{debugResult.policy.name}</span>
                    <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">
                      {getPolicyScope(debugResult.policy)}
                    </span>
                    <span
                      className={`rounded px-2 py-1 text-xs ${
                        debugResult.policy.reviewMode === ReviewMode.AUTO_APPROVE
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {debugResult.policy.reviewMode === ReviewMode.AUTO_APPROVE
                        ? "Auto-Approve"
                        : "Manual Review"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">
                    <strong>Max Amount:</strong> ${debugResult.policy.maxAmount}
                  </p>
                  {debugResult.policy.description && (
                    <p className="text-sm text-gray-600">
                      {debugResult.policy.description}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-red-600">
                  ❌ No applicable policy found
                </p>
              )}
            </div>

            <div className="rounded-lg border border-purple-300 bg-white p-4">
              <h3 className="mb-2 font-semibold text-purple-900">
                Resolution Explanation
              </h3>
              <p className="mb-3 text-sm text-gray-700">
                {debugResult.debugInfo.selectionReason}
              </p>

              {debugResult.debugInfo.applicablePolicies.length > 0 && (
                <>
                  <h4 className="mb-2 text-sm font-semibold text-purple-800">
                    All Applicable Policies (in precedence order):
                  </h4>
                  <div className="space-y-2">
                    {debugResult.debugInfo.applicablePolicies.map(
                      (ap, idx: number) => (
                        <div
                          key={ap.policy.id}
                          className={`rounded border p-2 text-sm ${
                            idx === 0
                              ? "border-green-300 bg-green-50"
                              : "border-gray-200 bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {idx === 0 && (
                              <span className="text-green-600">✓</span>
                            )}
                            <span className="font-medium">
                              {ap.policy.name}
                            </span>
                            <span className="rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-800">
                              {ap.specificity}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-gray-600">
                            {ap.reason}
                          </p>
                          <p className="mt-1 text-xs text-gray-700">
                            Max: ${ap.policy.maxAmount} •{" "}
                            {ap.policy.reviewMode === ReviewMode.AUTO_APPROVE
                              ? "Auto-Approve"
                              : "Manual Review"}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </>
              )}

              <div className="mt-3 rounded bg-purple-100 p-2 text-xs text-purple-800">
                <strong>Precedence Rules:</strong> User+Category &gt;
                Org+Category &gt; User-wide &gt; Org-wide
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Policies List */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">Policies</h2>
        {!policies || policies.length === 0 ? (
          <p className="text-gray-600">
            No policies yet. Create one above to get started!
          </p>
        ) : (
          <div className="space-y-2">
            {policies.map((policy) => (
              <div key={policy.id} className="rounded-lg border p-4">
                {editingId === policy.id ? (
                  // Edit mode
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-sm font-medium">
                          Name
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded border px-3 py-2"
                          disabled={updatePolicy.isPending}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">
                          Max Amount ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editMaxAmount}
                          onChange={(e) => setEditMaxAmount(e.target.value)}
                          className="w-full rounded border px-3 py-2"
                          disabled={updatePolicy.isPending}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Description
                      </label>
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full rounded border px-3 py-2"
                        rows={2}
                        disabled={updatePolicy.isPending}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Review Mode
                      </label>
                      <select
                        value={editReviewMode}
                        onChange={(e) =>
                          setEditReviewMode(e.target.value as ReviewMode)
                        }
                        className="w-full rounded border px-3 py-2"
                        disabled={updatePolicy.isPending}
                      >
                        <option value={ReviewMode.MANUAL_REVIEW}>
                          Manual Review
                        </option>
                        <option value={ReviewMode.AUTO_APPROVE}>
                          Auto-Approve
                        </option>
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdate(policy.id)}
                        disabled={
                          updatePolicy.isPending ||
                          !editName.trim() ||
                          !editMaxAmount
                        }
                        className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700 disabled:bg-gray-400"
                      >
                        {updatePolicy.isPending ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={updatePolicy.isPending}
                        className="rounded bg-gray-300 px-3 py-1 text-sm hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                    {updatePolicy.error && (
                      <p className="text-sm text-red-600">
                        {updatePolicy.error.message}
                      </p>
                    )}
                  </div>
                ) : (
                  // View mode
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{policy.name}</h3>
                        <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">
                          {getPolicyScope(policy)}
                        </span>
                        <span
                          className={`rounded px-2 py-1 text-xs ${
                            policy.reviewMode === ReviewMode.AUTO_APPROVE
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {policy.reviewMode === ReviewMode.AUTO_APPROVE
                            ? "Auto-Approve"
                            : "Manual Review"}
                        </span>
                      </div>

                      {policy.description && (
                        <p className="mb-2 text-sm text-gray-600">
                          {policy.description}
                        </p>
                      )}

                      <div className="text-sm text-gray-700">
                        <p>
                          <strong>Max Amount:</strong> ${policy.maxAmount}
                        </p>
                        {policy.category && (
                          <p>
                            <strong>Category:</strong> {policy.category.name}
                          </p>
                        )}
                        {policy.user && (
                          <p>
                            <strong>User:</strong>{" "}
                            {policy.user.name ?? policy.user.email}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(policy)}
                        className="rounded bg-blue-100 px-3 py-1 text-sm text-blue-700 hover:bg-blue-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `Are you sure you want to delete "${policy.name}"?`,
                            )
                          ) {
                            deletePolicy.mutate({ id: policy.id });
                          }
                        }}
                        disabled={deletePolicy.isPending}
                        className="rounded bg-red-100 px-3 py-1 text-sm text-red-700 hover:bg-red-200 disabled:bg-gray-200"
                      >
                        {deletePolicy.isPending ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
