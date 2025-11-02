"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Role } from "@prisma/client";
import Link from "next/link";

export default function CategoriesPageClient({ orgId }: { orgId: string }) {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const utils = api.useUtils();

  // Queries
  const { data: orgData } = api.org.get.useQuery({ orgId });
  const { data: categories, isLoading } = api.category.list.useQuery({ orgId });

  const isAdmin = orgData?.role === Role.ADMIN;

  // Mutations
  const createCategory = api.category.create.useMutation({
    onSuccess: () => {
      setNewCategoryName("");
      setNewCategoryDescription("");
      void utils.category.list.invalidate();
    },
  });

  const updateCategory = api.category.update.useMutation({
    onSuccess: () => {
      setEditingId(null);
      void utils.category.list.invalidate();
    },
  });

  const deleteCategory = api.category.delete.useMutation({
    onSuccess: () => {
      void utils.category.list.invalidate();
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName.trim()) {
      createCategory.mutate({
        orgId,
        name: newCategoryName,
        description: newCategoryDescription || undefined,
      });
    }
  };

  const handleUpdate = (id: string) => {
    if (editName.trim()) {
      updateCategory.mutate({
        id,
        name: editName,
        description: editDescription || null,
      });
    }
  };

  const startEdit = (category: { id: string; name: string; description: string | null }) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditDescription(category.description ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditDescription("");
  };

  if (isLoading) {
    return (
      <main className="p-6">
        <p>Loading categories...</p>
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

  return (
    <main className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expense Categories</h1>
          <p className="text-gray-600">{orgData.org.name}</p>
        </div>
        <Link
          href="/orgs"
          className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
        >
          Back to Organizations
        </Link>
      </div>

      {/* Create Category - Admin Only */}
      {isAdmin && (
        <section className="mb-8 rounded-lg border p-4">
          <h2 className="mb-4 text-xl font-semibold">Create Category</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category name"
                className="w-full rounded border px-3 py-2"
                disabled={createCategory.isPending}
              />
            </div>
            <div>
              <textarea
                value={newCategoryDescription}
                onChange={(e) => setNewCategoryDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full rounded border px-3 py-2"
                rows={2}
                disabled={createCategory.isPending}
              />
            </div>
            <button
              type="submit"
              disabled={createCategory.isPending || !newCategoryName.trim()}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
            >
              {createCategory.isPending ? "Creating..." : "Create Category"}
            </button>
            {createCategory.error && (
              <p className="text-sm text-red-600">
                {createCategory.error.message}
              </p>
            )}
          </form>
        </section>
      )}

      {/* Categories List */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">Categories</h2>
        {!categories || categories.length === 0 ? (
          <p className="text-gray-600">
            No categories yet.{" "}
            {isAdmin && "Create one above to get started!"}
          </p>
        ) : (
          <div className="space-y-2">
            {categories.map((category) => (
              <div key={category.id} className="rounded-lg border p-4">
                {editingId === category.id ? (
                  // Edit mode
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded border px-3 py-2"
                      disabled={updateCategory.isPending}
                    />
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full rounded border px-3 py-2"
                      rows={2}
                      disabled={updateCategory.isPending}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdate(category.id)}
                        disabled={updateCategory.isPending || !editName.trim()}
                        className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700 disabled:bg-gray-400"
                      >
                        {updateCategory.isPending ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={updateCategory.isPending}
                        className="rounded bg-gray-300 px-3 py-1 text-sm hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                    {updateCategory.error && (
                      <p className="text-sm text-red-600">
                        {updateCategory.error.message}
                      </p>
                    )}
                  </div>
                ) : (
                  // View mode
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{category.name}</h3>
                      {category.description && (
                        <p className="text-sm text-gray-600">
                          {category.description}
                        </p>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(category)}
                          className="rounded bg-blue-100 px-3 py-1 text-sm text-blue-700 hover:bg-blue-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `Are you sure you want to delete "${category.name}"?`,
                              )
                            ) {
                              deleteCategory.mutate({ id: category.id });
                            }
                          }}
                          disabled={deleteCategory.isPending}
                          className="rounded bg-red-100 px-3 py-1 text-sm text-red-700 hover:bg-red-200 disabled:bg-gray-200"
                        >
                          {deleteCategory.isPending ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    )}
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
