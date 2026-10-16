import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const permissionKeys = [
  "can_approve_reject",
  "can_sync_system",
  "can_edit_applications",
  "can_edit_site",
  "can_manage_settings",
  "can_export_data",
] as const;
type PermissionKey = typeof permissionKeys[number];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anonKey || !serviceKey) return json({ error: "Admin service is not configured." }, 500);

    const token = authorization.slice("Bearer ".length);
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(token);
    const callerId = claims?.claims?.sub;
    if (claimsError || !callerId) return json({ error: "Invalid or expired session." }, 401);

    const admin = createClient(url, serviceKey);
    const { data: caller, error: callerError } = await admin.from("admin_permissions")
      .select("is_super_admin, is_active")
      .eq("user_id", callerId)
      .maybeSingle();
    if (callerError || !caller?.is_active || !caller.is_super_admin) return json({ error: "Only an active Super Admin can manage staff accounts." }, 403);

    const body = await req.json().catch(() => null);
    const action = body?.action;
    if (action === "list_admins") {
      const { data: rows, error } = await admin.from("admin_permissions").select("*").order("is_super_admin", { ascending: false }).order("full_name");
      if (error) throw error;
      const authUsers: any[] = [];
      for (let page = 1; page <= 10; page += 1) {
        const { data: pageData, error: usersError } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (usersError) throw usersError;
        authUsers.push(...pageData.users);
        if (pageData.users.length < 1000) break;
      }
      const usersById = new Map(authUsers.map(user => [user.id, user]));
      const admins = (rows || []).map(row => {
        const authUser = usersById.get(row.user_id);
        return {
          ...row,
          last_sign_in_at: authUser?.last_sign_in_at ?? null,
          invited_at: authUser?.invited_at ?? null,
        };
      });
      return json({ admins });
    }

    if (action === "invite_admin") {
      const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
      const fullName = typeof body?.full_name === "string" ? body.full_name.trim() : "";
      const redirectTo = typeof body?.redirect_to === "string" ? body.redirect_to : "";
      if (fullName.length < 2 || fullName.length > 120) return json({ error: "Enter a full name between 2 and 120 characters." }, 400);
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Enter a valid email address." }, 400);

      let parsedRedirect: URL;
      try { parsedRedirect = new URL(redirectTo); } catch { return json({ error: "Invitation redirect is invalid." }, 400); }
      const requestOrigin = req.headers.get("origin");
      if (parsedRedirect.pathname !== "/admin/reset-password" || parsedRedirect.search || parsedRedirect.hash || parsedRedirect.origin !== requestOrigin || (parsedRedirect.protocol !== "https:" && parsedRedirect.hostname !== "localhost")) {
        return json({ error: "Invitation redirect must point to this site's admin password setup page." }, 400);
      }

      const flags: Record<PermissionKey, boolean> = Object.fromEntries(permissionKeys.map(key => [key, key === "can_approve_reject" ? body?.[key] !== false : body?.[key] === true])) as Record<PermissionKey, boolean>;
      const { data: invite, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName },
        redirectTo: parsedRedirect.toString(),
      });
      if (inviteError || !invite.user) return json({ error: inviteError?.message || "Invitation could not be created." }, 409);

      const userId = invite.user.id;
      const { error: studentRoleError } = await admin.from("user_roles").delete().eq("user_id", userId);
      if (studentRoleError) {
        await admin.auth.admin.deleteUser(userId);
        return json({ error: "Invitation was created, but the default student role could not be removed. The account was rolled back; please retry." }, 500);
      }
      const { error: roleError } = await admin.from("user_roles").upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
      if (roleError) {
        await admin.auth.admin.deleteUser(userId);
        return json({ error: "Invitation was created, but the admin role could not be assigned. The account was rolled back; please retry." }, 500);
      }
      const { error: permissionError } = await admin.from("admin_permissions").insert({
        user_id: userId,
        full_name: fullName,
        email,
        invited_by: callerId,
        ...flags,
      });
      if (permissionError) {
        await admin.from("user_roles").delete().eq("user_id", userId);
        await admin.auth.admin.deleteUser(userId);
        return json({ error: "Invitation was created, but staff permissions could not be saved. The account was rolled back; please retry." }, 500);
      }
      return json({ success: true, user_id: userId });
    }

    if (action === "update_permissions") {
      const userId = typeof body?.user_id === "string" ? body.user_id : "";
      if (!/^[0-9a-f-]{36}$/i.test(userId)) return json({ error: "A valid admin user_id is required." }, 400);
      const { data: existing, error: lookupError } = await admin.from("admin_permissions").select("is_super_admin").eq("user_id", userId).maybeSingle();
      if (lookupError) throw lookupError;
      if (!existing) return json({ error: "Admin account not found." }, 404);
      if (existing.is_super_admin) return json({ error: "The founding Super Admin permissions cannot be changed." }, 403);
      const updates: Record<string, boolean> = {};
      for (const key of permissionKeys) if (typeof body?.[key] === "boolean") updates[key] = body[key];
      if (typeof body?.is_active === "boolean") updates.is_active = body.is_active;
      if (Object.keys(updates).length === 0) return json({ error: "No permission changes were provided." }, 400);
      const { error } = await admin.from("admin_permissions").update(updates).eq("user_id", userId);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === "delete_admin") {
      const userId = typeof body?.user_id === "string" ? body.user_id : "";
      if (!/^[0-9a-f-]{36}$/i.test(userId)) return json({ error: "A valid admin user_id is required." }, 400);
      if (userId === callerId) return json({ error: "You cannot revoke your own Super Admin access." }, 400);
      const { data: existing, error: lookupError } = await admin.from("admin_permissions").select("is_super_admin").eq("user_id", userId).maybeSingle();
      if (lookupError) throw lookupError;
      if (!existing) return json({ error: "Admin account not found." }, 404);
      if (existing.is_super_admin) return json({ error: "The founding Super Admin access cannot be revoked." }, 403);
      const { error } = await admin.from("admin_permissions").update({
        is_active: false,
        can_approve_reject: false,
        can_sync_system: false,
        can_edit_applications: false,
        can_edit_site: false,
        can_manage_settings: false,
        can_export_data: false,
      }).eq("user_id", userId);
      if (error) throw error;
      return json({ success: true, account_retained: true });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (error) {
    console.error("manage-admins failed", error);
    return json({ error: "Admin management request failed. Please try again or contact the project owner." }, 500);
  }
});
