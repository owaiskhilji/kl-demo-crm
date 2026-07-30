---
name: supabase-auth-pattern
description: Guides the agent through correctly implementing session verification and route protection in Central Homes CRM using Supabase Auth and Next.js 16's proxy.ts. Use whenever building a protected page, Server Action, Route Handler, or the root proxy.ts / lib/supabase/proxy.ts session-refresh logic — and whenever reviewing code for authorization correctness.
---

# Supabase Auth Pattern (proxy.ts + getClaims/getUser/getSession)

## When to use this skill
- Writing or editing `proxy.ts` (root) or `lib/supabase/proxy.ts`
- Protecting any new page, Server Action, or Route Handler
- Reviewing existing code for authorization bugs
- Debugging "users randomly logged out" or "agent can see another agent's data" issues

## The single most important rule
**Never use `getSession()` for authorization.** It is loaded from storage and not re-validated — it can be spoofed if storage is shared with the client, and it does not confirm whether a session has been server-side revoked. This is Supabase's own explicit warning, not a style preference.

## Which function to use where
| Function | Use for | Behavior |
|---|---|---|
| `getClaims()` | Default choice — protecting pages/data in Server Components, Server Actions, Route Handlers | Validates the JWT signature locally (WebCrypto + cached JWKS). Fast, no network call. Does not confirm server-side logout. |
| `getUser()` | When certainty of no server-side revocation is required (e.g. immediately after a sensitive action like a password change) | Live network call to the Supabase Auth server. Slower, authoritative. |
| `getSession()` | Only to forward the raw access/refresh token to another service | Never for authorization decisions. |

## Three-layer defense model — implement all three, independently
1. **`proxy.ts`** — refreshes the session cookie on matching requests via `updateSession()` in `lib/supabase/proxy.ts`; redirects unauthenticated users away from protected routes. This is a UX convenience layer, not the security boundary. It runs on Node.js runtime only in Next.js 16 (not configurable) — do not build against the deprecated `middleware.ts` pattern.
2. **Server Components / Server Actions / Route Handlers** — call `getClaims()` (or `getUser()` when appropriate) explicitly, on every protected page and every mutating action. Never assume `proxy.ts` already handled it — a matcher misconfiguration or a newly added route without a matcher update silently reopens a page.
3. **Supabase RLS** — default-deny on every table (see the `rls-policy-pattern` skill). This is the last line of defense: even a bug in a Server Action can't leak another agent's leads if RLS is correctly configured.

## proxy.ts contract
```typescript
// proxy.ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

## lib/supabase/proxy.ts responsibilities (in order)
1. Create a Supabase server client reading/writing cookies against the request/response pair.
2. Call `getClaims()` to refresh the token if needed.
3. Write the refreshed token back via both `request.cookies.set(...)` and `response.cookies.set(...)`.
4. Return the response object exactly as constructed — do not build a fresh `NextResponse.next()` and drop the cookies. This is the most common cause of "randomly logged out" reports.

## Protecting a page — Server Component pattern
```typescript
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
  // proceed — role-specific data access still goes through RLS regardless
}
```

## Caching hazard
Do not apply ISR or CDN caching to any authenticated route without explicitly excluding `Set-Cookie` from the cache key. A cached session-refresh response containing `Set-Cookie` can be served to a different user, silently logging them into someone else's session.

## Common mistakes to avoid
- Using `getSession()` anywhere authorization is decided.
- Treating `proxy.ts` as sufficient protection on its own — always re-verify in the Server Component/Action/Route Handler.
- Building a fresh `NextResponse` in `proxy.ts` instead of returning the one constructed with the refreshed cookies.
- Applying caching to authenticated routes without protecting against the `Set-Cookie` leak described above.

## Reference
See CLAUDE.md / GEMINI.md §3 and §4 for full source citations (Next.js 16 upgrade guide, Supabase server-side auth docs).
