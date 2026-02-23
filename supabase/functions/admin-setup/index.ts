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
      // Check if admin is already configured
      const { data } = await supabase.from("admin_setup").select("*").limit(1);
      return new Response(JSON.stringify({ configured: (data && data.length > 0) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      // Check if already configured
      const { data: existing } = await supabase.from("admin_setup").select("*").limit(1);
      if (existing && existing.length > 0) {
        return new Response(JSON.stringify({ error: "Admin already configured" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { email, password } = await req.json();
      if (!email || !password) {
        return new Response(JSON.stringify({ error: "Email and password required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create admin user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authError) {
        return new Response(JSON.stringify({ error: "Failed to create admin account." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Remove auto-assigned student role (from trigger) and assign admin role
      await supabase.from("user_roles").delete().eq("user_id", authData.user.id).eq("role", "student");
      await supabase.from("user_roles").insert({
        user_id: authData.user.id,
        role: "admin",
      });

      // Mark setup as complete
      await supabase.from("admin_setup").insert({ is_configured: true });

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
