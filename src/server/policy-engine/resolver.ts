import type { Policy } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * Policy resolution result with debugging information
 */
export interface PolicyResolutionResult {
  policy: Policy | null;
  debugInfo: {
    applicablePolicies: Array<{
      policy: Policy;
      specificity: "user-category" | "user-wide" | "org-category" | "org-wide";
      reason: string;
    }>;
    selectedPolicy: Policy | null;
    selectionReason: string;
  };
}

/**
 * Resolve the applicable policy for a user/category combination.
 * 
 * Precedence rules (highest to lowest):
 * 1. User-specific + Category-specific
 * 2. Organization-wide + Category-specific
 * 3. User-specific + No category (user-wide)
 * 4. Organization-wide + No category (org-wide default)
 * 
 * @param policies - All policies for the organization
 * @param userId - The user ID to resolve for
 * @param categoryId - The category ID to resolve for (optional)
 * @returns Policy resolution result with debug information
 */
export function resolvePolicy(
  policies: Policy[],
  userId: string,
  categoryId?: string,
): PolicyResolutionResult {
  const applicablePolicies: PolicyResolutionResult["debugInfo"]["applicablePolicies"] =
    [];

  // Filter and categorize applicable policies
  for (const policy of policies) {
    // User-specific + Category-specific
    if (policy.userId === userId && policy.categoryId === categoryId) {
      applicablePolicies.push({
        policy,
        specificity: "user-category",
        reason: `User-specific policy for category ${categoryId}`,
      });
    }
    // User-specific + No category (user-wide)
    else if (policy.userId === userId && !policy.categoryId) {
      applicablePolicies.push({
        policy,
        specificity: "user-wide",
        reason: `User-wide policy (applies to all categories for user ${userId})`,
      });
    }
    // Organization-wide + Category-specific
    else if (!policy.userId && policy.categoryId === categoryId) {
      applicablePolicies.push({
        policy,
        specificity: "org-category",
        reason: `Organization-wide policy for category ${categoryId}`,
      });
    }
    // Organization-wide + No category (org-wide default)
    else if (!policy.userId && !policy.categoryId) {
      applicablePolicies.push({
        policy,
        specificity: "org-wide",
        reason: `Organization-wide default policy (applies to all users and categories)`,
      });
    }
  }

  // Sort by precedence (specificity order defined above)
  const specificityOrder = {
    "user-category": 1,
    "org-category": 2,
    "user-wide": 3,
    "org-wide": 4,
  };

  applicablePolicies.sort(
    (a, b) =>
      specificityOrder[a.specificity] - specificityOrder[b.specificity],
  );

  // Select the highest precedence policy
  const selectedPolicy = applicablePolicies[0]?.policy ?? null;
  const selectionReason = selectedPolicy
    ? `Selected ${applicablePolicies[0]!.specificity} policy: ${applicablePolicies[0]!.reason}`
    : categoryId
      ? `No applicable policy found for user ${userId} and category ${categoryId}`
      : `No applicable policy found for user ${userId}`;

  return {
    policy: selectedPolicy,
    debugInfo: {
      applicablePolicies,
      selectedPolicy,
      selectionReason,
    },
  };
}

/**
 * Check if an expense amount is within policy limits
 */
export function isWithinPolicyLimit(
  amount: number | Decimal,
  policy: Policy | null,
): { allowed: boolean; reason: string } {
  if (!policy) {
    return {
      allowed: false,
      reason: "No applicable policy found",
    };
  }

  const amountDecimal =
    typeof amount === "number" ? new Decimal(amount) : amount;
  const maxAmount = policy.maxAmount;

  if (amountDecimal.lte(maxAmount)) {
    return {
      allowed: true,
      reason: `Amount ${amountDecimal.toString()} is within policy limit of ${maxAmount.toString()}`,
    };
  }

  return {
    allowed: false,
    reason: `Amount ${amountDecimal.toString()} exceeds policy limit of ${maxAmount.toString()}`,
  };
}
