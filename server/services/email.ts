import nodemailer from "nodemailer";
import dns from "dns";

// Force Node to prefer IPv4 (for SMTP fallback on local dev).
dns.setDefaultResultOrder("ipv4first");

interface EmailParams {
  to: string;
  subject: string;
  htmlBody: string;
  from?: string;
  name?: string;
  userId?: string;
}

/**
 * Build an RFC 2822 email and Base64URL-encode it for the Gmail API.
 */
function buildRawEmail(params: {
  from: string;
  to: string;
  subject: string;
  html: string;
  name?: string;
}): string {
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const lines = [
    `From: "${params.name || "Saca Tech"}" <${params.from}>`,
    `To: ${params.to}`,
    `Subject: =?UTF-8?B?${Buffer.from(params.subject).toString("base64")}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(params.html).toString("base64"),
    ``,
    `--${boundary}--`,
  ];
  const raw = lines.join("\r\n");
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Send email via Gmail REST API (HTTPS, port 443).
 * This bypasses Render's SMTP port blocking (465/587).
 */
async function sendViaGmailAPI(params: EmailParams, emailUser: string): Promise<{ success: boolean; error?: string }> {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return { success: false, error: "GMAIL_API_NOT_CONFIGURED" };
  }

  try {
    const { google } = await import("googleapis");
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, "https://developers.google.com/oauthplayground");
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const raw = buildRawEmail({
      from: emailUser,
      to: params.to,
      subject: params.subject,
      html: params.htmlBody,
      name: params.name,
    });

    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    console.log(`[GMAIL API SUCCESS] Email sent to ${params.to} (messageId: ${result.data.id})`);
    return { success: true };
  } catch (err: any) {
    console.error(`[GMAIL API ERROR]:`, err?.message || err);
    return { success: false, error: `Gmail API: ${err?.message || "Unknown error"}` };
  }
}

/**
 * Send email via SMTP (Nodemailer). Fallback for local development
 * where SMTP ports are not blocked.
 */
async function sendViaSMTP(params: EmailParams, emailUser: string, emailPassword: string): Promise<{ success: boolean; error?: string }> {
  const cleanPass = emailPassword.replace(/['"\\s]+/g, "");

  const mailOptions = {
    from: `"${params.name || "Saca Tech"}" <${emailUser}>`,
    to: params.to,
    subject: params.subject,
    html: params.htmlBody,
  };

  const transportConfigs = [
    {
      loggingName: "Port 465 (SSL)",
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      family: 4,
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 12000,
      auth: { user: emailUser, pass: cleanPass },
      tls: { rejectUnauthorized: false, servername: "smtp.gmail.com" },
    },
    {
      loggingName: "Port 587 (TLS)",
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      family: 4,
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 12000,
      auth: { user: emailUser, pass: cleanPass },
      tls: { rejectUnauthorized: false, servername: "smtp.gmail.com" },
    },
  ];

  let lastError = "";

  for (const config of transportConfigs) {
    try {
      const transporter = nodemailer.createTransport(config as any);
      await transporter.sendMail(mailOptions);
      console.log(`[SMTP SUCCESS] Email sent to ${params.to} using ${config.loggingName}`);
      return { success: true };
    } catch (err: any) {
      console.warn(`[SMTP WARN] Transport ${config.loggingName} failed:`, err.message);
      lastError = err.message;
    }
  }

  return { success: false, error: `SMTP (${emailUser}): ${lastError}` };
}

/**
 * Main sendEmail function.
 * Strategy:
 *   1. Try Gmail REST API (HTTPS) — works on Render and everywhere
 *   2. Fall back to SMTP (Nodemailer) — works on local dev where ports aren't blocked
 */
export async function sendEmail(params: EmailParams): Promise<{ success: boolean; error?: string }> {
  let emailUser = process.env.EMAIL_USER || "c@saca.technology";
  try {
    let emailPassword = "";

    if (params.userId) {
      const { storage } = await import("../storage");
      const config = await storage.getIntegrationsConfig(params.userId);
      if (config?.smtpEmail) emailUser = config.smtpEmail;
      // Ignore masked dots '••••••••••'
      if (config?.smtpPassword && config.smtpPassword !== "••••••••••" && !config.smtpPassword.includes("•")) {
        emailPassword = config.smtpPassword;
      }
    }

    if (!emailPassword) {
      emailPassword = process.env.EMAIL_PASSWORD || process.env.EMAIL_APP_PASSWORD || "";
    }

    // ── Strategy 1: Gmail REST API (HTTPS — not blocked by Render) ──
    console.log(`[EMAIL] Attempting Gmail API for ${params.to}...`);
    const apiResult = await sendViaGmailAPI(params, emailUser);
    if (apiResult.success) {
      return apiResult;
    }

    // If Gmail API is not configured, we log it and fall through to SMTP
    if (apiResult.error === "GMAIL_API_NOT_CONFIGURED") {
      console.log("[EMAIL] Gmail API not configured (missing GMAIL_CLIENT_ID/SECRET/REFRESH_TOKEN). Falling back to SMTP...");
    } else {
      console.warn(`[EMAIL] Gmail API failed: ${apiResult.error}. Falling back to SMTP...`);
    }

    // ── Strategy 2: SMTP Fallback (works on local dev) ──
    if (!emailPassword || emailPassword.includes("•")) {
      return {
        success: false,
        error: `❌ No se pudo enviar el correo: Gmail API no está configurada y no hay Contraseña de Aplicación SMTP. Configura las credenciales OAuth2 de Gmail (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN) en las variables de entorno de Render.`,
      };
    }

    const smtpResult = await sendViaSMTP(params, emailUser, emailPassword);
    return smtpResult;

  } catch (error: any) {
    console.error("[EMAIL] Unexpected error:", error);
    return {
      success: false,
      error: error?.message ? `Error (${emailUser}): ${error.message}` : "Error desconocido al enviar email",
    };
  }
}

export function generateEmailHTML(
  contacto: string,
  marca: string,
  nicho: string,
  campania: string,
  contenidoTexto: string,
  seguimientoHTML?: string,
  videoLink?: string,
  views?: string,
  contentIdea?: string
): string {
  const nichosEjemplo = "drones, microphones, robot vacuums, smartphones, smart home devices, projectors, headphones, and gaming accessories";
  
  // Extract content ideas from template
  let firstIdea = "";
  let secondIdea = "";
  
  if (contentIdea) {
    // Extract first idea (between first quotes)
    const firstIdeaMatch = contentIdea.match(/"([^"]+)"/);
    if (firstIdeaMatch) firstIdea = firstIdeaMatch[1];
    
    // Extract second idea (after "I propose the following content idea:")
    const secondIdeaMatch = contentIdea.match(/I propose the following content idea: "([^"]+)"/);
    if (secondIdeaMatch) secondIdea = secondIdeaMatch[1];
  }

  return `
    <div style="font-family: Arial, sans-serif; color:#333; line-height:1.5;">
      <p>Hi ${contacto || 'team'},</p>
      <p>I'm Carlos Saca from Saca Tech (@saca.technology). We publish engaging content across Instagram, TikTok, and YouTube.</p>
      ${campania && campania.toLowerCase() !== "general" && campania.toLowerCase() !== "seguimiento de correo" ? 
        `<p>Regarding the campaign: <b>${campania}</b>, we would love to collaborate with you during this period.</p>` : ''}
      ${campania && campania.toLowerCase() !== "seguimiento de correo" ? 
        `<p>We collaborate with multiple brands across various niches (${nichosEjemplo}), achieving great reach and impact.</p>` : ''}
      ${campania && campania.toLowerCase() !== "seguimiento de correo" && videoLink && (firstIdea || secondIdea) ? 
        `<p>I want to show you how we have integrated content with the idea of "${firstIdea}" according to the link: <a href="${videoLink}" target="_blank">${videoLink}</a>. In order to achieve good reach with your product, I propose the following content idea: "${secondIdea}"${views ? ` with ${views}` : ''}. It is just one of the many ideas we could discuss together.</p>` : ''}
      ${seguimientoHTML || ''}
      <p>I look forward to discussing this collaboration further with you.</p>
      <p>Best regards,<br><b>Carlos Saca</b><br>Saca Tech<br>@saca.technology</p>
    </div>`;
}
