"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Role } from "@prisma/client";

export default function OrgsPageClient() {
  const [newOrgName, setNewOrgName] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>(Role.MEMBER);

  const utils = api.useUtils();

  // Queries
  const { data: orgs, isLoading: orgsLoading } = api.org.list.useQuery();

  // Get the selected org with membership info
  const { data: selectedOrgData } = api.org.get.useQuery(
    { orgId: selectedOrgId! },
    { enabled: !!selectedOrgId },
  );

  const isAdmin = selectedOrgData?.role === Role.ADMIN;

  // Only fetch members and invites if user is admin of selected org
  const { data: members } = api.membership.list.useQuery(
    { orgId: selectedOrgId! },
    { enabled: !!selectedOrgId && isAdmin },
  );
  const { data: pendingInvites } = api.invitation.listPending.useQuery(
    { orgId: selectedOrgId! },
    { enabled: !!selectedOrgId && isAdmin },
  );

  // Mutations
  const createOrg = api.org.create.useMutation({
    onSuccess: () => {
      setNewOrgName("");
      void utils.org.list.invalidate();
    },
  });

  const inviteUser = api.invitation.invite.useMutation({
    onSuccess: () => {
      setInviteEmail("");
      void utils.invitation.listPending.invalidate();
    },
  });

  const handleCreateOrg = (e: React.FormEvent) => {
    e.preventDefault();
    if (newOrgName.trim()) {
      createOrg.mutate({ name: newOrgName });
    }
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedOrgId && inviteEmail.trim()) {
      inviteUser.mutate({
        orgId: selectedOrgId,
        email: inviteEmail,
        role: inviteRole,
      });
    }
  };

  if (orgsLoading) {
    return (
      <main className="p-6">
        <p>Loading organizations...</p>
      </main>
    );
  }

  return (
    <main className="p-6">
      <h1 className="mb-6 text-3xl font-bold">Organizations</h1>

      {/* Create Organization */}
      <section className="mb-8 rounded-lg border p-4">
        <h2 className="mb-4 text-xl font-semibold">Create Organization</h2>
        <form onSubmit={handleCreateOrg} className="flex gap-2">
          <input
            type="text"
            value={newOrgName}
            onChange={(e) => setNewOrgName(e.target.value)}
            placeholder="Organization name"
            className="flex-1 rounded border px-3 py-2"
            disabled={createOrg.isPending}
          />
          <button
            type="submit"
            disabled={createOrg.isPending || !newOrgName.trim()}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
          >
            {createOrg.isPending ? "Creating..." : "Create"}
          </button>
        </form>
        {createOrg.error && (
          <p className="mt-2 text-sm text-red-600">{createOrg.error.message}</p>
        )}
      </section>

      {/* Organizations List */}
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">Your Organizations</h2>
        {!orgs || orgs.length === 0 ? (
          <p className="text-gray-600">No organizations yet. Create one above!</p>
        ) : (
          <div className="space-y-2">
            {orgs.map((item) => (
              <div
                key={item.org.id}
                className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                  selectedOrgId === item.org.id
                    ? "border-blue-500 bg-blue-50"
                    : "hover:bg-gray-50"
                }`}
                onClick={() => setSelectedOrgId(item.org.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{item.org.name}</h3>
                    <p className="text-sm text-gray-600">Role: {item.role}</p>
                  </div>
                  {selectedOrgId === item.org.id && (
                    <span className="text-sm text-blue-600">Selected</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Organization Details */}
      {selectedOrgId && selectedOrgData && (
        <>
          {/* Quick Links */}
          <section className="mb-8 rounded-lg border p-4">
            <h2 className="mb-4 text-xl font-semibold">Quick Links</h2>
            <div className="flex gap-2">
              <a
                href={`/orgs/${selectedOrgId}/categories`}
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Manage Categories
              </a>
            </div>
          </section>

          {/* Show admin-only message if not admin */}
          {!isAdmin && (
            <section className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-blue-800">
                You are a member of this organization. Only admins can invite
                users and view the full member list.
              </p>
            </section>
          )}

          {/* Invite Users - Admin Only */}
          {isAdmin && (
            <section className="mb-8 rounded-lg border p-4">
              <h2 className="mb-4 text-xl font-semibold">Invite User</h2>
              <form onSubmit={handleInvite} className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="flex-1 rounded border px-3 py-2"
                    disabled={inviteUser.isPending}
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as Role)}
                    className="rounded border px-3 py-2"
                    disabled={inviteUser.isPending}
                  >
                    <option value={Role.MEMBER}>Member</option>
                    <option value={Role.ADMIN}>Admin</option>
                  </select>
                  <button
                    type="submit"
                    disabled={inviteUser.isPending || !inviteEmail.trim()}
                    className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:bg-gray-400"
                  >
                    {inviteUser.isPending ? "Inviting..." : "Invite"}
                  </button>
                </div>
                {inviteUser.error && (
                  <p className="text-sm text-red-600">
                    {inviteUser.error.message}
                  </p>
                )}
                {inviteUser.isSuccess && (
                  <p className="text-sm text-green-600">
                    Invitation sent! Check console for invite link.
                  </p>
                )}
              </form>
            </section>
          )}

          {/* Pending Invitations - Admin Only */}
          {isAdmin && pendingInvites && pendingInvites.length > 0 && (
            <section className="mb-8 rounded-lg border p-4">
              <h2 className="mb-4 text-xl font-semibold">
                Pending Invitations
              </h2>
              <div className="space-y-2">
                {pendingInvites.map((invite) => (
                  <div key={invite.id} className="rounded border p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{invite.email}</p>
                        <p className="text-sm text-gray-600">
                          Role: {invite.role} • Expires:{" "}
                          {new Date(invite.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Members List - Admin Only */}
          {isAdmin && members && (
            <section className="rounded-lg border p-4">
              <h2 className="mb-4 text-xl font-semibold">Members</h2>
              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.id} className="rounded border p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {member.user.name ?? member.user.email}
                        </p>
                        <p className="text-sm text-gray-600">
                          {member.user.email} • {member.role}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
