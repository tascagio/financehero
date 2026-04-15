import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type EventPayload = {
  eventName?: string;
  page?: string;
  pagePath?: string;
  pageUrl?: string;
  referrer?: string;
  sessionId?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  attribution?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
    first_referrer?: string;
    landing_page?: string;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Content-Type": "application/json"
};

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const payload = (await request.json()) as EventPayload;

    if (!payload.eventName) {
      return jsonResponse({ error: "eventName is required." }, 400);
    }

    const supabase = getSupabaseAdminClient();
    const eventMetadata = {
      ...(payload.metadata || {}),
      first_referrer: payload.attribution?.first_referrer || null,
      landing_page: payload.attribution?.landing_page || null
    };
    const { error } = await supabase.from("analytics_events").insert({
      event_name: payload.eventName,
      page: payload.page || null,
      page_path: payload.pagePath || null,
      page_url: payload.pageUrl || null,
      referrer: payload.referrer || null,
      session_id: payload.sessionId || null,
      utm_source: payload.attribution?.utm_source || null,
      utm_medium: payload.attribution?.utm_medium || null,
      utm_campaign: payload.attribution?.utm_campaign || null,
      utm_content: payload.attribution?.utm_content || null,
      utm_term: payload.attribution?.utm_term || null,
      metadata: eventMetadata,
      lead_id: typeof payload.metadata?.lead_id === "string" ? payload.metadata.lead_id : null
    });

    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    if (payload.sessionId) {
      const sessionPayload: Record<string, unknown> = {
        id: payload.sessionId,
        updated_at: new Date().toISOString(),
        page_path: payload.pagePath || null,
        page_url: payload.pageUrl || null,
        referrer: payload.referrer || null,
        utm_source: payload.attribution?.utm_source || null,
        utm_medium: payload.attribution?.utm_medium || null,
        utm_campaign: payload.attribution?.utm_campaign || null,
        utm_content: payload.attribution?.utm_content || null,
        utm_term: payload.attribution?.utm_term || null,
        user_agent: payload.userAgent || request.headers.get("user-agent") || null,
        metadata: {
          first_referrer: payload.attribution?.first_referrer || null,
          landing_page: payload.attribution?.landing_page || null,
          last_event_name: payload.eventName
        }
      };

      if (payload.eventName === "form_submit_success") {
        sessionPayload.converted = true;

        if (typeof payload.metadata?.lead_id === "string" && payload.metadata.lead_id.trim()) {
          sessionPayload.lead_id = payload.metadata.lead_id;
        }
      }

      const { error: sessionError } = await supabase
        .from("sessions")
        .upsert(sessionPayload, { onConflict: "id", ignoreDuplicates: false });

      if (sessionError) {
        return jsonResponse({ error: sessionError.message }, 500);
      }
    }

    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      500
    );
  }
});

function getSupabaseAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });
}

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders
  });
}
