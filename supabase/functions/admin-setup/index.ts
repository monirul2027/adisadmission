import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (req.method === "GET") {
      const { data } = await supabase.from("admin_setup").select("*").limit(1);
      return new Response(JSON.stringify({ configured: (data && data.length > 0) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      // Defense-in-depth: fast-fail if already configured before parsing body
      const { data: existing } = await supabase.from("admin_setup").select("id").limit(1);
      if (existing && existing.length > 0) {
        return new Response(JSON.stringify({ error: "Admin already configured" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { full_name, email, password } = await req.json();

      // Input validation
      if (typeof full_name !== "string" || !full_name.trim() || full_name.trim().length > 100 || !email || !password) {
        return new Response(JSON.stringify({ error: "Admin name, email, and password are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (typeof email !== "string" || !emailRegex.test(email) || email.length > 254) {
        return new Response(JSON.stringify({ error: "Invalid email format." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (email.trim().toLowerCase() !== "alordishaislamicschool@gmail.com") {
        return new Response(JSON.stringify({ error: "Initial Super Admin setup is reserved for the founding school account." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (typeof password !== "string" || password.length < 8 || password.length > 128) {
        return new Response(JSON.stringify({ error: "Password must be between 8 and 128 characters." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Atomically insert setup record - unique index prevents race condition
      const { error: setupError } = await supabase
        .from("admin_setup")
        .insert({ is_configured: true });

      if (setupError) {
        return new Response(JSON.stringify({ error: "Admin already configured" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create admin user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name.trim() },
      });

      if (authError) {
        // Rollback setup record if user creation fails
        await supabase.from("admin_setup").delete().eq("is_configured", true);
        return new Response(JSON.stringify({ error: "Failed to create admin account." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Remove auto-assigned student role (from trigger) and assign admin role
      await supabase.from("user_roles").delete().eq("user_id", authData.user.id);
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: authData.user.id,
        role: "admin",
      });
      if (roleError) {
        await supabase.auth.admin.deleteUser(authData.user.id);
        await supabase.from("admin_setup").delete().eq("is_configured", true);
        return new Response(JSON.stringify({ error: "Could not assign the initial admin role." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: permissionError } = await supabase.from("admin_permissions").insert({
        user_id: authData.user.id,
        full_name: full_name.trim(),
        email: email.trim().toLowerCase(),
        is_super_admin: true,
      });
      if (permissionError) {
        await supabase.from("user_roles").delete().eq("user_id", authData.user.id);
        await supabase.auth.admin.deleteUser(authData.user.id);
        await supabase.from("admin_setup").delete().eq("is_configured", true);
        return new Response(JSON.stringify({ error: "Could not save initial administrator permissions." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: "An unexpected error occurred." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
