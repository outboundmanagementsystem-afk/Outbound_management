/**
 * Centralized role → dashboard route mapping.
 * Single source of truth used by: auth-context, protected-route, page.tsx, login page, dashboard layout.
 */

export type AppRole =
    | "admin"
    | "owner"
    | "sales_lead"
    | "sales"
    | "pre_ops_lead"
    | "pre_ops"
    | "post_ops_lead"
    | "post_ops"
    | "finance"
    | "finance_lead"

/**
 * Returns the dashboard path for a given role.
 * Falls back to "/login" for unknown roles.
 */
export function getRoleDashboard(role: string | undefined | null): string {
    switch (role) {
        case "admin":
        case "owner":
            return "/admin"
        case "sales":
        case "sales_lead":
            return "/sales"
        case "ops":
        case "ops_lead":
        case "pre_ops":
        case "pre_ops_lead":
            return "/ops"
        case "post_ops":
        case "post_ops_lead":
            return "/post-ops"
        case "finance":
        case "finance_lead":
            return "/finance"
        default:
            return "/login"
    }
}

/**
 * Checks whether a role is a known, valid application role.
 */
export function isValidRole(role: string | undefined | null): role is AppRole {
    const validRoles: string[] = [
        "admin", "owner", "sales_lead", "sales",
        "pre_ops_lead", "pre_ops", "post_ops_lead", "post_ops",
        "finance", "finance_lead",
    ]
    return typeof role === "string" && validRoles.includes(role)
}

/**
 * Given a role and a list of allowed roles, determines if the user is permitted.
 * Automatically treats "owner" as having "admin" access.
 */
export function isRoleAllowed(role: string, allowedRoles: string[]): boolean {
    const effectiveRoles = [...allowedRoles]
    if (effectiveRoles.includes("admin") && !effectiveRoles.includes("owner")) {
        effectiveRoles.push("owner")
    }
    return effectiveRoles.includes(role)
}
