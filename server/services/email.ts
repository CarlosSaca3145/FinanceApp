import nodemailer from "nodemailer";
import dns from "dns";

// Force Node to prefer IPv4. Render uses IPv6 which Google SMTP often silently drops/timeouts.
dns.setDefaultResultOrder("ipv4first");

const transporterCache = new Map<string, nodemailer.Transporter>();

interface EmailParams {
  to: string;
  subject: string;
  htmlBody: string;
  from?: string;
  name?: string;
  userId?: string;
}

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

    if (!emailPassword || emailPassword.includes("•")) {
      return {
        success: false,
        error: "❌ No se pudo enviar el correo: no hay Contraseña de Aplicación de Gmail configurada. Ingresa tu Contraseña de Aplicación (16 caracteres) para " + emailUser,
      };
    }

    // Strip quotes and whitespace from App Password
    const cleanPass = emailPassword.replace(/['"\s]+/g, "");

    const mailOptions = {
      from: `"${params.name || "Saca Tech"}" <${emailUser}>`,
      to: params.to,
      subject: params.subject,
      html: params.htmlBody,
    };

    // We will try multiple configurations sequentially if one fails due to rate limits or timeouts.
    // We avoid 'pool: true' because NAT/firewalls often drop idle connections silently, causing 15s hangs.
    const transportConfigs = [
      {
        loggingName: "Port 465 (SSL)",
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        connectionTimeout: 20000, // 20s
        greetingTimeout: 20000,
        socketTimeout: 30000, // 30s
        auth: { user: emailUser, pass: cleanPass },
        tls: { rejectUnauthorized: false },
      },
      {
        loggingName: "Port 587 (TLS)",
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        requireTLS: true,
        connectionTimeout: 20000,
        greetingTimeout: 20000,
        socketTimeout: 30000,
        auth: { user: emailUser, pass: cleanPass },
        tls: { rejectUnauthorized: false },
      },
      {
        loggingName: "Gmail Service (Fallback)",
        service: "gmail",
        connectionTimeout: 20000,
        greetingTimeout: 20000,
        socketTimeout: 30000,
        auth: { user: emailUser, pass: cleanPass },
        tls: { rejectUnauthorized: false },
      }
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

    return {
      success: false,
      error: `Error SMTP (${emailUser}): ${lastError}`,
    };
  } catch (error: any) {
    console.error('Email sending error:', error);
    return { 
      success: false, 
      error: error?.message ? `Error SMTP (${emailUser}): ${error.message}` : "Error desconocido al enviar email" 
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
