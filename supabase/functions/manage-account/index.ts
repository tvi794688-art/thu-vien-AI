import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AccountRole = "admin" | "librarian" | "reader";
type AccountStatus = "active" | "locked";
const ROLES: AccountRole[] = ["admin", "librarian", "reader"];
const ACCOUNT_STATUSES: AccountStatus[] = ["active", "locked"];
const READER_TYPES = ["student", "teacher", "staff", "guest"] as const;

function response(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const accessToken = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return response({ error: "Server Supabase configuration is missing" }, 500);
    }
    if (!accessToken) return response({ error: "Authentication required" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser(accessToken);
    if (authError || !user) return response({ error: "Invalid session" }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: actor, error: actorError } = await adminClient
      .from("profiles")
      .select("role, account_status")
      .eq("id", user.id)
      .maybeSingle();
    if (actorError || actor?.role !== "admin" || actor.account_status !== "active") {
      return response({ error: "Only an active Admin may manage accounts" }, 403);
    }

    const rawBody: unknown = await req.json();
    if (!isRecord(rawBody)) return response({ error: "Invalid request" }, 400);
    const action = rawBody.action;

    if (action === "create") {
      const fullName = typeof rawBody.fullName === "string" ? rawBody.fullName.trim() : "";
      const email = typeof rawBody.email === "string" ? rawBody.email.trim().toLowerCase() : "";
      const role = rawBody.role;
      if (!fullName || fullName.length > 120) return response({ error: "Please enter a valid full name" }, 400);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return response({ error: "Please enter a valid email address" }, 400);
      if (typeof role !== "string" || !ROLES.includes(role as AccountRole)) return response({ error: "Invalid account role" }, 400);

      const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName },
      });
      if (inviteError || !invited.user) {
        return response({ error: inviteError?.message || "Could not send the account invitation" }, 400);
      }

      const userId = invited.user.id;
      const { data: savedProfile, error: profileError } = await adminClient
        .from("profiles")
        .update({ full_name: fullName, role: role as AccountRole, account_status: "active" })
        .eq("id", userId)
        .select("id")
        .maybeSingle();

      if (profileError || !savedProfile) {
        const { error: cleanupError } = await adminClient.auth.admin.deleteUser(userId);
        const cleanupNote = cleanupError ? " The invited Auth user could not be removed automatically; check the account before retrying." : " The incomplete account was removed.";
        return response({ error: `${profileError?.message || "The profile trigger did not create a profile."}${cleanupNote}` }, 500);
      }

      const { error: auditError } = await adminClient.from("account_admin_audit").insert({
        actor_id: user.id,
        target_id: userId,
        operation: "account_created",
        old_role: "reader",
        new_role: role,
        old_account_status: "active",
        new_account_status: "active",
      });
      if (auditError) {
        const { error: cleanupError } = await adminClient.auth.admin.deleteUser(userId);
        const cleanupNote = cleanupError ? " The Auth user could not be removed automatically; check the account before retrying." : " The incomplete account was removed.";
        return response({ error: `Could not record account creation.${cleanupNote}` }, 500);
      }

      return response({ success: true, userId, message: "Invitation sent" }, 201);
    }

    const targetId = typeof rawBody.targetId === "string" ? rawBody.targetId : "";
    if (!targetId) return response({ error: "A valid account is required" }, 400);

    const { data: target, error: targetError } = await adminClient
      .from("profiles")
      .select("role, account_status")
      .eq("id", targetId)
      .maybeSingle();
    if (targetError || !target) return response({ error: "Account not found" }, 404);

    if (action === "update_profile") {
      if (!isRecord(rawBody.profile)) return response({ error: "Invalid profile data" }, 400);
      const fullName = typeof rawBody.profile.full_name === "string" ? rawBody.profile.full_name.trim() : "";
      const phone = typeof rawBody.profile.phone === "string" ? rawBody.profile.phone.trim() : "";
      const address = typeof rawBody.profile.address === "string" ? rawBody.profile.address.trim() : "";
      const readerType = rawBody.profile.reader_type;
      if (!fullName || fullName.length > 120) return response({ error: "Please enter a valid full name" }, 400);
      if (readerType !== null && readerType !== undefined && !READER_TYPES.includes(readerType as typeof READER_TYPES[number])) {
        return response({ error: "Invalid reader type" }, 400);
      }

      const { error: profileError } = await adminClient.from("profiles").update({
        full_name: fullName,
        phone: phone || null,
        address: address || null,
        reader_type: readerType ?? null,
      }).eq("id", targetId);
      if (profileError) return response({ error: profileError.message }, 400);
      return response({ success: true }, 200);
    }

    if (action !== "update") return response({ error: "Invalid account action" }, 400);
    const role = rawBody.role;
    const accountStatus = rawBody.accountStatus;
    if (typeof role !== "string" || !ROLES.includes(role as AccountRole)) return response({ error: "Invalid account role" }, 400);
    if (typeof accountStatus !== "string" || !ACCOUNT_STATUSES.includes(accountStatus as AccountStatus)) {
      return response({ error: "Invalid account status" }, 400);
    }

    // On unlock, restore Auth first while the database still blocks the account.
    if (target.account_status === "locked" && accountStatus === "active") {
      const { error } = await adminClient.auth.admin.updateUserById(targetId, { ban_duration: "none" });
      if (error) return response({ error: `Could not unlock Supabase Auth account: ${error.message}` }, 502);
    }

    const { error: updateError } = await userClient.rpc("admin_update_account", {
      p_target_id: targetId,
      p_role: role as AccountRole,
      p_account_status: accountStatus as AccountStatus,
    });
    if (updateError) {
      if (target.account_status === "locked" && accountStatus === "active") {
        await adminClient.auth.admin.updateUserById(targetId, { ban_duration: "876000h" });
      }
      return response({ error: updateError.message }, 400);
    }

    // Database policies block the user before Auth is banned, protecting APIs
    // even if this Auth Admin request fails or an old access token remains.
    if (target.account_status !== "locked" && accountStatus === "locked") {
      const { error } = await adminClient.auth.admin.updateUserById(targetId, { ban_duration: "876000h" });
      if (error) {
        return response({ error: `Database access is locked, but Supabase Auth could not be banned: ${error.message}` }, 502);
      }
    }

    return response({ success: true }, 200);
  } catch (error: unknown) {
    return response({ error: error instanceof Error ? error.message : "Account management failed" }, 500);
  }
});
