import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const EDUNEST_URL = "https://myedunest.lovable.app/api/public/admission-sync";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const secret = Deno.env.get("ADMISSION_WEBHOOK_SECRET");
    if (!secret) return json({ error: "Sync secret is not configured" }, 500);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    const userId = claims?.claims?.sub;
    if (claimsError || !userId) return json({ error: "Invalid token" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
    if (!roles?.some((r) => r.role === "admin")) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => null);
    const applicationId = body?.application_id;
    if (typeof applicationId !== "string" || !/^[0-9a-f-]{36}$/i.test(applicationId)) {
      return json({ error: "application_id is required" }, 400);
    }
    const section = body?.section;
    if (!["GREEN", "VIOLET", "BLUE", "ORANGE"].includes(section)) {
      return json({ error: "A valid section (GREEN, VIOLET, BLUE, ORANGE) is required" }, 400);
    }
    const rollNumber = typeof body?.roll_number === "string" ? body.roll_number.trim() : "";
    const admissionFee = Number(body?.admission_fee ?? 0);
    const monthlyFee = Number(body?.monthly_fee ?? 0);
    if (!Number.isFinite(admissionFee) || admissionFee < 0 || !Number.isFinite(monthlyFee) || monthlyFee < 0) {
      return json({ error: "admission_fee and monthly_fee must be non-negative numbers" }, 400);
    }

    // Always read the authoritative row from the database instead of trusting client data.
    const { data, error } = await admin.from("applications").select("*").eq("id", applicationId).maybeSingle();
    if (error || !data) return json({ error: "Application not found" }, 404);
    if (data.status !== "Approved" || !data.student_code) return json({ error: "Application is not approved" }, 400);

    const payload = {
      student_code: data.student_code,
      full_name: data.full_name,
     guardian_name: data.father_name,
      contact: data.mobile_no,
      village: data.present_vill,
      po: data.present_po,
      ps: data.present_ps,
      dist: data.present_dist,
      class_name: data.desired_class,
      session_year: data.session,
      section,
    };

    const res = await fetch(EDUNEST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("EduNest sync failed", res.status, text);
      let parsed: any = null;
      try { parsed = JSON.parse(text); } catch { /* non-JSON body */ }
      const pick = (v: unknown) => (typeof v === "string" ? v : v ? JSON.stringify(v) : "");
      const detail =
        pick(parsed?.error) || pick(parsed?.message) || pick(parsed?.detail) ||
        (text && text.trim().length < 300 ? text.trim() : "") ||
        `EduNest responded with HTTP ${res.status}`;
      return json({ success: false, status: res.status, error: `EduNest (${res.status}): ${detail}` }, 502);
    }
    if (admissionFee > 0 || monthlyFee > 0) {
      const feePortalUrl = Deno.env.get("FEE_PORTAL_WEBHOOK_URL");
      const feeWebhookSecret = Deno.env.get("FEE_WEBHOOK_SECRET");
      if (!feePortalUrl || !feeWebhookSecret) {
        console.error("Fee Portal sync skipped: FEE_PORTAL_WEBHOOK_URL or FEE_WEBHOOK_SECRET is not configured");
      } else {
        try {
          const feeResponse = await fetch(feePortalUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${feeWebhookSecret}` },
            body: JSON.stringify({
              name: data.full_name,
              guardian_name: data.father_name,
              class: data.desired_class,
              section,
              roll_number: rollNumber,
              admission_fee: admissionFee,
              monthly_fee: monthlyFee,
              village: data.present_vill,
              phone: data.mobile_no,
              student_code: data.student_code,
            }),
          });
          if (!feeResponse.ok) console.error("Fee Portal sync failed", feeResponse.status, await feeResponse.text());
        } catch (feeError) {
          console.error("Fee Portal sync failed", feeError);
        }
      }
    }

    return json({ success: true, student_code: data.student_code });
  } catch (err) {
    console.error("sync-to-edunest error", err);
    return json({ success: false, error: "Sync failed" }, 500);
  }
});
