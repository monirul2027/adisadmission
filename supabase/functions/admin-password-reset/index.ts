import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: Record<string, string>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { email, redirectTo } = await req.json();
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return json({ error: "Email not registered" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: users, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersError) throw usersError;

    const user = users.users.find((candidate) => candidate.email?.toLowerCase() === normalizedEmail);
    if (!user) return json({ error: "Email not registered" }, 404);

    const { data: role, error: roleError } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (roleError) throw roleError;
    if (!role) return json({ error: "Email not registered" }, 403);

    const client = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const isAllowedRedirect = (value: string) => {
      try {
        const parsed = new URL(value);
        if (parsed.protocol === "https:") return true;
        return parsed.protocol === "http:" && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1");
      } catch {
        return false;
      }
    };
    const safeRedirect = typeof redirectTo === "string" && isAllowedRedirect(redirectTo)
      ? redirectTo
      : undefined;
    const { error: resetError } = await client.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: safeRedirect,
    });
    if (resetError) throw resetError;

    return json({ message: "Password reset email sent" });
  } catch (error) {
    console.error("Admin password reset failed", error);
    return json({ error: "Unable to send reset email. Please try again." }, 500);
  }
});
