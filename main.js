const defaultConfig = {
  siteUrl: "https://financehero.com.br",
  calendlyUrl: "",
  whatsappUrl: "",
  contactEmail: "giovanni@financehero.com.br",
  analyticsEnabled: true,
  consentVersion: "2026-04",
  storageKeys: {
    consent: "financehero_cookie_consent",
    sessionId: "financehero_session_id",
    lastLead: "financehero_last_lead",
    utm: "financehero_utm_context"
  },
  supabase: {
    url: "",
    anonKey: "",
    functions: {
      captureLead: "capture-lead",
      trackEvent: "track-event"
    }
  }
};

const memoryStorage = new Map();
const memorySessionStorage = new Map();
const config = mergeDeep(defaultConfig, window.FINANCEHERO_CONFIG || {});
const dataLayer = (window.dataLayer = window.dataLayer || []);
const currentPage = document.body.dataset.page || "landing";
const sessionId = getOrCreateSessionId();
const consent = getStoredConsent();
const attribution = getAttributionContext();

document.querySelectorAll("[data-current-year]").forEach((node) => {
  node.textContent = new Date().getFullYear();
});

initReveal();
initNavigation();
initSchedulerLinks();
initMethodCarousel();
initCookieBanner();
initTrackedCtas();
initPageTracking();

if (currentPage === "landing") {
  initLeadForm();
  initSectionTracking();
  initScrollDepthTracking();
}

function mergeDeep(base, incoming) {
  if (!incoming || typeof incoming !== "object") {
    return deepClone(base);
  }

  const output = deepClone(base);

  Object.entries(incoming).forEach(([key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value) && output[key]) {
      output[key] = mergeDeep(output[key], value);
      return;
    }

    output[key] = value;
  });

  return output;
}

function deepClone(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

function initReveal() {
  const elements = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.18 }
  );

  elements.forEach((element) => observer.observe(element));
}

function initPageTracking() {
  let tracked = false;

  const firePageView = () => {
    if (tracked) {
      return;
    }

    tracked = true;
    pushDataLayer("page_view", {
      page: document.title,
      pagePath: window.location.pathname
    });
    trackEvent(
      "page_view",
      {
        page: document.title,
        pagePath: window.location.pathname,
        pageUrl: window.location.href,
        referrer: document.referrer || null
      },
      { requiresConsent: false }
    ).catch(console.error);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", firePageView, { once: true });
    return;
  }

  firePageView();
}

function initNavigation() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".site-nav");

  if (!toggle || !nav) {
    return;
  }

  toggle.addEventListener("click", () => {
    const nextExpanded = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(nextExpanded));
    nav.classList.toggle("is-open", nextExpanded);
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      toggle.setAttribute("aria-expanded", "false");
      nav.classList.remove("is-open");
    });
  });
}

function initSchedulerLinks() {
  const links = document.querySelectorAll(".js-scheduler-link");
  const fallbackTarget = currentPage === "thank-you"
    ? "./index.html#lead-form"
    : "#lead-form";
  const target = config.calendlyUrl && isValidUrl(config.calendlyUrl)
    ? config.calendlyUrl
    : fallbackTarget;

  links.forEach((link) => {
    link.setAttribute("href", target);

    if (target.startsWith("http")) {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noreferrer");
      link.textContent = currentPage === "thank-you"
        ? "Agende uma reunião grátis"
        : "Agendar conversa";
    }
  });
}

function initCookieBanner() {
  const banner = document.querySelector(".cookie-banner");

  if (!banner) {
    return;
  }

  if (consent) {
    hideCookieBanner(banner);
    return;
  }

  banner.hidden = false;
}

function initMethodCarousel() {
  const track = document.querySelector("[data-carousel-track]");
  const previousButton = document.querySelector("[data-carousel-prev]");
  const nextButton = document.querySelector("[data-carousel-next]");
  const progressBar = document.querySelector(".carousel-progress-bar");

  if (!track || !previousButton || !nextButton || !progressBar) {
    return;
  }

  const updateProgress = () => {
    const maxScroll = Math.max(track.scrollWidth - track.clientWidth, 1);
    const currentProgress = track.scrollLeft / maxScroll;
    const visibleRatio = track.clientWidth / track.scrollWidth;
    const progressWidth = Math.min(1, Math.max(visibleRatio, 0.18));
    const translate = (1 - progressWidth) * currentProgress;

    progressBar.style.width = `${progressWidth * 100}%`;
    progressBar.style.transform = `translateX(${translate * 100}%)`;
  };

  const moveTrack = (direction) => {
    const firstCard = track.querySelector(".method-card");
    const cardWidth = firstCard
      ? firstCard.getBoundingClientRect().width + parseFloat(getComputedStyle(track).gap || "24")
      : track.clientWidth * 0.85;

    track.scrollBy({
      left: direction * cardWidth,
      behavior: "smooth"
    });
  };

  previousButton.addEventListener("click", () => moveTrack(-1));
  nextButton.addEventListener("click", () => moveTrack(1));
  track.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
  updateProgress();
}

function hideCookieBanner(banner) {
  banner.hidden = true;
  banner.setAttribute("aria-hidden", "true");
  banner.classList.add("is-hidden");
  banner.style.display = "none";
}

window.__financeHeroCookieChoice = (choice, triggerElement) => {
  const banner = triggerElement?.closest(".cookie-banner") || document.querySelector(".cookie-banner");

  if (!banner) {
    return;
  }

  const accepted = choice === "accept";
  saveConsent({ analytics: accepted, timestamp: new Date().toISOString() });
  hideCookieBanner(banner);

  if (accepted) {
    pushDataLayer("privacy_banner_accept", {
      consent_version: config.consentVersion
    });
    trackEvent(
      "privacy_banner_accept",
      {
        metadata: {
          consent_version: config.consentVersion
        }
      },
      { requiresConsent: false }
    ).catch(console.error);
    return;
  }

  pushDataLayer("privacy_banner_reject", {
    consent_version: config.consentVersion
  });
  trackEvent(
    "privacy_banner_reject",
    {
      metadata: {
        consent_version: config.consentVersion
      }
    },
    { requiresConsent: false }
  ).catch(console.error);
};

function initTrackedCtas() {
  document.querySelectorAll(".js-track-cta, [data-cta]").forEach((element) => {
    element.addEventListener("click", () => {
      const ctaLabel = element.dataset.cta || element.textContent?.trim() || "unknown_cta";
      const ctaLocation = getCtaLocation(element);

      pushDataLayer("cta_click", {
        cta_label: ctaLabel,
        cta_location: ctaLocation
      });
      trackEvent(
        "cta_click",
        {
          metadata: {
            cta_label: ctaLabel,
            cta_location: ctaLocation
          }
        },
        { requiresConsent: false }
      ).catch(console.error);
    });
  });
}

function initScrollDepthTracking() {
  const trackedDepths = new Set(getSessionArray("financehero_scroll_depths"));
  const thresholds = [25, 50, 75, 100];
  let scheduled = false;

  const storeTrackedDepths = () => {
    sessionSet("financehero_scroll_depths", JSON.stringify([...trackedDepths].sort((a, b) => a - b)));
  };

  const handleDepth = () => {
    scheduled = false;

    const documentHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, 1);
    const currentDepth = Math.min(
      100,
      Math.round(((window.scrollY + window.innerHeight) / documentHeight) * 100)
    );

    thresholds.forEach((threshold) => {
      if (currentDepth < threshold || trackedDepths.has(threshold)) {
        return;
      }

      trackedDepths.add(threshold);
      storeTrackedDepths();
      pushDataLayer("scroll_depth", { depth_percent: threshold });
      trackEvent(
        "scroll_depth",
        {
          metadata: {
            depth_percent: threshold
          }
        },
        { requiresConsent: false }
      ).catch(console.error);
    });
  };

  window.addEventListener(
    "scroll",
    () => {
      if (scheduled) {
        return;
      }

      scheduled = true;
      window.requestAnimationFrame(handleDepth);
    },
    { passive: true }
  );

  handleDepth();
}

function initSectionTracking() {
  const trackedSections = new Set(getSessionArray("financehero_section_views"));
  const targets = document.querySelectorAll("#dores, #solucao, #metodo, #fit, #lead-form");

  if (!targets.length) {
    return;
  }

  const markSeen = (sectionId) => {
    trackedSections.add(sectionId);
    sessionSet("financehero_section_views", JSON.stringify([...trackedSections]));
  };

  const dispatchView = (section) => {
    const sectionId = section.id;

    if (!sectionId || trackedSections.has(sectionId)) {
      return;
    }

    markSeen(sectionId);
    trackEvent(
      "section_view",
      {
        metadata: {
          section_id: sectionId,
          section_label: getSectionLabel(section)
        }
      },
      { requiresConsent: false }
    ).catch(console.error);
  };

  if (!("IntersectionObserver" in window)) {
    targets.forEach(dispatchView);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.4) {
          return;
        }

        dispatchView(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.4 }
  );

  targets.forEach((section) => {
    if (trackedSections.has(section.id)) {
      return;
    }

    observer.observe(section);
  });
}

function initLeadForm() {
  const form = document.querySelector(".lead-form");

  if (!form) {
    return;
  }

  const feedback = form.querySelector(".form-feedback");
  const submitButton = form.querySelector('button[type="submit"]');
  const phoneInput = form.querySelector('input[name="phone"]');
  const cnpjInput = form.querySelector('input[name="cnpj"]');
  const revenueSelect = form.querySelector('select[name="revenueRange"]');
  const formId = form.id || "lead-form";
  let formStarted = sessionGet("financehero_form_started") === "true";

  phoneInput?.addEventListener("input", () => {
    phoneInput.value = formatPhone(phoneInput.value);
  });

  cnpjInput?.addEventListener("input", () => {
    cnpjInput.value = formatCnpj(cnpjInput.value);
  });

  revenueSelect?.addEventListener("change", () => {
    revenueSelect.setCustomValidity("");
  });

  form.addEventListener("focusin", (event) => {
    const target = event.target;

    if (
      formStarted ||
      !(target instanceof HTMLElement) ||
      !target.matches("input, select, textarea")
    ) {
      return;
    }

    formStarted = true;
    sessionSet("financehero_form_started", "true");
    trackEvent(
      "form_start",
      {
        metadata: {
          form_id: formId
        }
      },
      { requiresConsent: false }
    ).catch(console.error);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    setFeedback(feedback, "");
    trackEvent(
      "form_submit_attempt",
      {
        metadata: {
          form_id: formId
        }
      },
      { requiresConsent: false }
    ).catch(console.error);

    const payload = collectFormPayload(form);
    const validationError = validateLeadPayload(payload);

    if (validationError) {
      setFeedback(feedback, validationError, "error");
      return;
    }

    const originalLabel = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = "Enviando...";

    try {
      const response = await sendLead(payload);
      pushDataLayer("form_submit_success", { lead_id: response.leadId });
      await trackEvent(
        "form_submit_success",
        {
          metadata: {
            lead_id: response.leadId,
            form_id: formId
          }
        },
        { requiresConsent: false }
      ).catch(console.error);

      storageSet(
        config.storageKeys.lastLead,
        JSON.stringify({
          leadId: response.leadId,
          submittedAt: new Date().toISOString(),
          company: payload.company,
          revenueRange: payload.revenueRange
        })
      );

      const thankYouUrl = new URL("./obrigado.html", window.location.href);
      thankYouUrl.searchParams.set("lead", response.leadId);
      window.location.assign(thankYouUrl.toString());
    } catch (error) {
      console.error(error);
      setFeedback(
        feedback,
        "Não foi possível enviar agora. Verifique os dados e tente novamente em instantes.",
        "error"
      );
      pushDataLayer("form_submit_error", { error_message: error.message });
      await trackEvent(
        "form_submit_error",
        {
          metadata: {
            error_message: error.message,
            form_id: formId
          }
        },
        { requiresConsent: false }
      ).catch(console.error);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
    }
  });
}

function collectFormPayload(form) {
  const formData = new FormData(form);

  return {
    fullName: String(formData.get("fullName") || "").trim(),
    company: String(formData.get("company") || "").trim(),
    email: String(formData.get("email") || "").trim().toLowerCase(),
    phone: String(formData.get("phone") || "").trim(),
    revenueRange: String(formData.get("revenueRange") || "").trim(),
    cnpj: String(formData.get("cnpj") || "").trim(),
    challenge: String(formData.get("challenge") || "").trim(),
    consent: Boolean(formData.get("consent")),
    consentVersion: config.consentVersion,
    consentAnalytics: Boolean(getStoredConsent()?.analytics),
    pagePath: window.location.pathname,
    pageUrl: window.location.href,
    referrer: document.referrer || "",
    sessionId,
    source: "landing_page",
    userAgent: navigator.userAgent,
    attribution,
    destinationEmail: config.contactEmail,
    qualification: getQualification(String(formData.get("revenueRange") || "").trim())
  };
}

function validateLeadPayload(payload) {
  if (!payload.fullName || payload.fullName.length < 3) {
    return "Informe o nome completo.";
  }

  if (!payload.company || payload.company.length < 2) {
    return "Informe o nome da empresa.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    return "Informe um e-mail corporativo válido.";
  }

  if (!isValidPhone(payload.phone)) {
    return "Informe um telefone com DDD no formato (11) 99999-9999.";
  }

  if (!payload.revenueRange) {
    return "Selecione a faixa de faturamento anual.";
  }

  if (!payload.cnpj) {
    return "Informe o CNPJ da empresa.";
  }

  if (!isValidCnpj(payload.cnpj)) {
    return "O CNPJ informado não é válido.";
  }

  if (!payload.challenge || payload.challenge.length < 12) {
    return "Descreva o principal gargalo com um pouco mais de contexto.";
  }

  if (!payload.consent) {
    return "É necessário aceitar o tratamento dos dados para contato.";
  }

  return "";
}

async function sendLead(payload) {
  const functionName = config.supabase?.functions?.captureLead || "lead-capture";

  if (!hasSupabaseConfig()) {
    const leadId = `demo-${createUuid()}`;
    persistDemoLead(leadId, payload);
    return { leadId, mode: "demo" };
  }

  const response = await fetch(getFunctionUrl(functionName), {
    method: "POST",
    headers: buildSupabaseHeaders(),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await safeJson(response);
    throw new Error(errorBody?.error || "Falha ao gravar lead no Supabase.");
  }

  return response.json();
}

async function trackEvent(eventName, eventData = {}, options = {}) {
  const { requiresConsent = false } = options;
  const currentConsent = getStoredConsent();

  if (requiresConsent && !currentConsent?.analytics) {
    return null;
  }

  if (!config.analyticsEnabled) {
    return null;
  }

  const payload = {
    eventName,
    page: eventData.page ?? currentPage,
    pagePath: eventData.pagePath ?? window.location.pathname,
    pageUrl: eventData.pageUrl ?? window.location.href,
    referrer: eventData.referrer ?? document.referrer ?? "",
    sessionId,
    userAgent: navigator.userAgent,
    metadata: eventData.metadata || {},
    attribution
  };

  if (!hasSupabaseConfig()) {
    return null;
  }

  const functionName = config.supabase?.functions?.trackEvent || "track-event";
  const response = await fetch(getFunctionUrl(functionName), {
    method: "POST",
    headers: buildSupabaseHeaders(),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await safeJson(response);
    throw new Error(errorBody?.error || "Falha ao gravar evento.");
  }

  return response.json();
}

function sendEvent(eventName, metadata = {}, options = {}) {
  return trackEvent(eventName, { metadata }, options);
}

function pushDataLayer(event, extras = {}) {
  dataLayer.push({
    event,
    page: currentPage,
    sessionId,
    timestamp: new Date().toISOString(),
    ...extras
  });
}

function saveConsent(value) {
  storageSet(config.storageKeys.consent, JSON.stringify(value));
}

function getStoredConsent() {
  try {
    const rawValue = storageGet(config.storageKeys.consent);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch {
    return null;
  }
}

function getOrCreateSessionId() {
  const stored = sessionGet(config.storageKeys.sessionId);

  if (stored) {
    return stored;
  }

  const created = createUuid();
  sessionSet(config.storageKeys.sessionId, created);
  return created;
}

function getAttributionContext() {
  const url = new URL(window.location.href);
  const source = url.searchParams.get("utm_source");
  const medium = url.searchParams.get("utm_medium");
  const campaign = url.searchParams.get("utm_campaign");
  const content = url.searchParams.get("utm_content");
  const term = url.searchParams.get("utm_term");

  const latestContext = {
    utm_source: source || "",
    utm_medium: medium || "",
    utm_campaign: campaign || "",
    utm_content: content || "",
    utm_term: term || "",
    landing_page: window.location.pathname,
    first_referrer: document.referrer || ""
  };

  if (source || medium || campaign || content || term) {
    sessionSet(config.storageKeys.utm, JSON.stringify(latestContext));
    return latestContext;
  }

  try {
    const stored = sessionGet(config.storageKeys.utm);
    return stored ? JSON.parse(stored) : latestContext;
  } catch {
    return latestContext;
  }
}

function hasSupabaseConfig() {
  return Boolean(config.supabase?.url && config.supabase?.anonKey);
}

function getFunctionUrl(functionName) {
  return `${config.supabase.url.replace(/\/$/, "")}/functions/v1/${functionName}`;
}

function buildSupabaseHeaders() {
  return {
    "Content-Type": "application/json",
    apikey: config.supabase.anonKey,
    Authorization: `Bearer ${config.supabase.anonKey}`
  };
}

function persistDemoLead(leadId, payload) {
  const existing = JSON.parse(storageGet("financehero_demo_leads") || "[]");
  existing.push({
    leadId,
    createdAt: new Date().toISOString(),
    ...payload
  });
  storageSet("financehero_demo_leads", JSON.stringify(existing));
}

function storageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memoryStorage.get(key) ?? null;
  }
}

function storageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    memoryStorage.set(key, value);
  }
}

function sessionGet(key) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return memorySessionStorage.get(key) ?? null;
  }
}

function sessionSet(key, value) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    memorySessionStorage.set(key, value);
  }
}

function getSessionArray(key) {
  try {
    const value = sessionGet(key);
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

function createUuid() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  const template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  return template.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function formatPhone(value) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) {
    return digits ? `(${digits}` : "";
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function isValidPhone(value) {
  return value.replace(/\D/g, "").length >= 10;
}

function formatCnpj(value) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  const parts = [
    digits.slice(0, 2),
    digits.slice(2, 5),
    digits.slice(5, 8),
    digits.slice(8, 12),
    digits.slice(12, 14)
  ];

  if (digits.length <= 2) {
    return parts[0];
  }

  if (digits.length <= 5) {
    return `${parts[0]}.${parts[1]}`;
  }

  if (digits.length <= 8) {
    return `${parts[0]}.${parts[1]}.${parts[2]}`;
  }

  if (digits.length <= 12) {
    return `${parts[0]}.${parts[1]}.${parts[2]}/${parts[3]}`;
  }

  return `${parts[0]}.${parts[1]}.${parts[2]}/${parts[3]}-${parts[4]}`;
}

function isValidCnpj(value) {
  const cnpj = value.replace(/\D/g, "");

  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) {
    return false;
  }

  const calcDigit = (base, factor) => {
    let total = 0;

    for (const digit of base) {
      total += Number(digit) * factor--;
      if (factor < 2) {
        factor = 9;
      }
    }

    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstDigit = calcDigit(cnpj.slice(0, 12), 5);
  const secondDigit = calcDigit(cnpj.slice(0, 12) + String(firstDigit), 6);
  return cnpj.endsWith(`${firstDigit}${secondDigit}`);
}

function setFeedback(element, message, variant = "") {
  if (!element) {
    return;
  }

  element.textContent = message;
  element.classList.remove("is-success", "is-error");

  if (variant === "success") {
    element.classList.add("is-success");
  }

  if (variant === "error") {
    element.classList.add("is-error");
  }
}

function getQualification(revenueRange) {
  return revenueRange === "below_3m" ? "outside_icp" : "priority_icp";
}

function isValidUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getCtaLocation(element) {
  const container = element.closest("section[id], header[id], footer[id], section, header, footer");

  if (!container) {
    return currentPage;
  }

  if (container.id) {
    return container.id;
  }

  return container.tagName.toLowerCase();
}

function getSectionLabel(section) {
  return (
    section.dataset.label ||
    section.querySelector(".eyebrow")?.textContent?.trim() ||
    section.querySelector("h2")?.textContent?.trim() ||
    section.id
  );
}
