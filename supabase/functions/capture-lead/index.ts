import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_NOTIFICATION_TO = "giovanni@financehero.com.br";
const DEFAULT_NOTIFICATION_FROM = "FinanceHero <onboarding@resend.dev>";
const RESEND_API_URL = "https://api.resend.com/emails";

type LeadPayload = {
  fullName?: string;
  company?: string;
  email?: string;
  phone?: string;
  cnpj?: string;
  revenueRange?: string;
  challenge?: string;
  consent?: boolean;
  consentVersion?: string;
  consentAnalytics?: boolean;
  pagePath?: string;
  pageUrl?: string;
  referrer?: string;
  sessionId?: string;
  source?: string;
  userAgent?: string;
  destinationEmail?: string;
  qualification?: string;
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

type EmailNotificationResult = {
  provider: "resend";
  status: "sent" | "skipped" | "failed";
  to: string;
  from: string;
  externalId?: string;
  reason?: string;
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
    const payload = (await request.json()) as LeadPayload;
    const error = validateLeadPayload(payload);

    if (error) {
      return jsonResponse({ error }, 400);
    }

    const supabase = getSupabaseAdminClient();
    const leadId = crypto.randomUUID();
    const notificationRecipient = getNotificationRecipient(payload);
    const metadata = {
      destination_email: notificationRecipient,
      first_referrer: payload.attribution?.first_referrer || null,
      landing_page: payload.attribution?.landing_page || null
    };

    const { data, error: insertError } = await supabase
      .from("leads")
      .insert({
        id: leadId,
        full_name: payload.fullName,
        company: payload.company,
        email: payload.email?.toLowerCase(),
        phone: payload.phone,
        cnpj: payload.cnpj || null,
        annual_revenue: payload.revenueRange,
        main_challenge: payload.challenge,
        source: payload.source || "landing_page",
        qualification: payload.qualification || "priority_icp",
        page_path: payload.pagePath || null,
        page_url: payload.pageUrl || null,
        referrer: payload.referrer || null,
        session_id: payload.sessionId || null,
        user_agent: payload.userAgent || request.headers.get("user-agent") || null,
        consent_version: payload.consentVersion || null,
        consent_analytics: Boolean(payload.consentAnalytics),
        utm_source: payload.attribution?.utm_source || null,
        utm_medium: payload.attribution?.utm_medium || null,
        utm_campaign: payload.attribution?.utm_campaign || null,
        utm_content: payload.attribution?.utm_content || null,
        utm_term: payload.attribution?.utm_term || null,
        metadata
      })
      .select("id, metadata")
      .single();

    if (insertError || !data) {
      return jsonResponse(
        { error: insertError?.message || "Could not create lead." },
        500
      );
    }

    const notificationResult = await sendLeadNotification({
      leadId: data.id,
      payload,
      to: notificationRecipient
    });

    await persistNotificationMetadata(supabase, data.id, {
      ...(data.metadata || {}),
      notification: notificationResult
    });

    return jsonResponse(
      {
        leadId: data.id,
        emailNotification: notificationResult.status
      },
      200
    );
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

function getNotificationRecipient(payload: LeadPayload) {
  return payload.destinationEmail?.trim() || Deno.env.get("LEAD_NOTIFICATION_TO") || DEFAULT_NOTIFICATION_TO;
}

function getNotificationSender() {
  return Deno.env.get("LEAD_NOTIFICATION_FROM") || DEFAULT_NOTIFICATION_FROM;
}

async function sendLeadNotification(
  {
    leadId,
    payload,
    to
  }: {
    leadId: string;
    payload: LeadPayload;
    to: string;
  }
): Promise<EmailNotificationResult> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = getNotificationSender();

  if (!apiKey) {
    return {
      provider: "resend",
      status: "skipped",
      to,
      from,
      reason: "missing_resend_api_key"
    };
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "financehero-supabase-edge/1.0"
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `Novo lead FinanceHero: ${payload.company || payload.fullName || "sem empresa"}`,
        html: renderLeadNotificationHtml(leadId, payload),
        text: renderLeadNotificationText(leadId, payload),
        reply_to: payload.email,
        tags: [
          { name: "source", value: sanitizeTag(payload.source || "landing_page") },
          { name: "lead_id", value: sanitizeTag(leadId) }
        ]
      })
    });

    const body = await safeReadJson(response);

    if (!response.ok) {
      return {
        provider: "resend",
        status: "failed",
        to,
        from,
        reason: extractProviderError(body, response.statusText)
      };
    }

    return {
      provider: "resend",
      status: "sent",
      to,
      from,
      externalId: typeof body?.id === "string" ? body.id : undefined
    };
  } catch (error) {
    return {
      provider: "resend",
      status: "failed",
      to,
      from,
      reason: error instanceof Error ? error.message : "unexpected_email_provider_error"
    };
  }
}

async function persistNotificationMetadata(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  leadId: string,
  metadata: Record<string, unknown>
) {
  const { error } = await supabase
    .from("leads")
    .update({ metadata })
    .eq("id", leadId);

  if (error) {
    console.error("Could not persist notification metadata", error);
  }
}

function renderLeadNotificationHtml(leadId: string, payload: LeadPayload) {
  const rows = [
    ["Lead ID", leadId],
    ["Nome", payload.fullName || "-"],
    ["Empresa", payload.company || "-"],
    ["E-mail", payload.email || "-"],
    ["Telefone", payload.phone || "-"],
    ["CNPJ", payload.cnpj || "-"],
    ["Faturamento", payload.revenueRange || "-"],
    ["Principal gargalo", payload.challenge || "-"],
    ["Origem", payload.source || "landing_page"],
    ["Qualificacao", payload.qualification || "-"],
    ["Pagina", payload.pageUrl || payload.pagePath || "-"],
    ["Referrer", payload.referrer || "-"],
    ["UTM source", payload.attribution?.utm_source || "-"],
    ["UTM medium", payload.attribution?.utm_medium || "-"],
    ["UTM campaign", payload.attribution?.utm_campaign || "-"],
    ["UTM content", payload.attribution?.utm_content || "-"],
    ["UTM term", payload.attribution?.utm_term || "-"]
  ];

  const rowMarkup = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:10px 12px;border:1px solid #e2e8f0;font-weight:700;background:#f8fafc;">${escapeHtml(label)}</td>
          <td style="padding:10px 12px;border:1px solid #e2e8f0;">${escapeHtml(String(value))}</td>
        </tr>
      `
    )
    .join("");

  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#102334;">
      <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;color:#051c2c;">Novo lead FinanceHero</h1>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#4a5568;">
        Um novo lead foi enviado pela landing page e esta pronto para atendimento comercial.
      </p>
      <table style="border-collapse:collapse;width:100%;font-size:14px;line-height:1.5;">
        <tbody>${rowMarkup}</tbody>
      </table>
    </div>
  `;
}

function renderLeadNotificationText(leadId: string, payload: LeadPayload) {
  return [
    "Novo lead FinanceHero",
    "",
    `Lead ID: ${leadId}`,
    `Nome: ${payload.fullName || "-"}`,
    `Empresa: ${payload.company || "-"}`,
    `E-mail: ${payload.email || "-"}`,
    `Telefone: ${payload.phone || "-"}`,
    `CNPJ: ${payload.cnpj || "-"}`,
    `Faturamento: ${payload.revenueRange || "-"}`,
    `Principal gargalo: ${payload.challenge || "-"}`,
    `Origem: ${payload.source || "landing_page"}`,
    `Qualificacao: ${payload.qualification || "-"}`,
    `Pagina: ${payload.pageUrl || payload.pagePath || "-"}`,
    `Referrer: ${payload.referrer || "-"}`,
    `UTM source: ${payload.attribution?.utm_source || "-"}`,
    `UTM medium: ${payload.attribution?.utm_medium || "-"}`,
    `UTM campaign: ${payload.attribution?.utm_campaign || "-"}`,
    `UTM content: ${payload.attribution?.utm_content || "-"}`,
    `UTM term: ${payload.attribution?.utm_term || "-"}`
  ].join("\n");
}

function sanitizeTag(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 256) || "n-a";
}

function extractProviderError(body: unknown, fallback: string) {
  if (body && typeof body === "object") {
    const message = "message" in body ? body.message : undefined;
    const error = "error" in body ? body.error : undefined;

    if (typeof message === "string" && message.trim()) {
      return message;
    }

    if (typeof error === "string" && error.trim()) {
      return error;
    }
  }

  return fallback || "email_provider_request_failed";
}

async function safeReadJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function validateLeadPayload(payload: LeadPayload) {
  if (!payload.fullName || payload.fullName.trim().length < 3) {
    return "Full name is required.";
  }

  if (!payload.company || payload.company.trim().length < 2) {
    return "Company is required.";
  }

  if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    return "A valid e-mail is required.";
  }

  if (!payload.phone || payload.phone.replace(/\D/g, "").length < 10) {
    return "A valid phone is required.";
  }

  if (!payload.revenueRange) {
    return "Revenue range is required.";
  }

  if (!payload.cnpj) {
    return "CNPJ is required.";
  }

  if (!payload.challenge || payload.challenge.trim().length < 12) {
    return "Challenge description is required.";
  }

  if (!payload.consent) {
    return "Consent is required.";
  }

  return "";
}

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders
  });
}
