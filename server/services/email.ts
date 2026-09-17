import nodemailer from "nodemailer";

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

    // Try service: "gmail" first (optimized for Google App Passwords), then fallback to direct ports
    const transportOptions = [
      {
        name: "Gmail Service",
        options: {
          service: "gmail",
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
          auth: { user: emailUser, pass: cleanPass },
          tls: { rejectUnauthorized: false },
        },
      },
      {
        name: "Port 587 (TLS)",
        options: {
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
          requireTLS: true,
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
          auth: { user: emailUser, pass: cleanPass },
          tls: { rejectUnauthorized: false },
        },
      },
      {
        name: "Port 465 (SSL)",
        options: {
          host: "smtp.gmail.com",
          port: 465,
          secure: true,
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
          auth: { user: emailUser, pass: cleanPass },
          tls: { rejectUnauthorized: false },
        },
      },
    ];

    let lastErrorMsg = "";

    for (const item of transportOptions) {
      try {
        const transporter = nodemailer.createTransport(item.options as any);
        await transporter.sendMail(mailOptions);
        console.log(`[SMTP SUCCESS] Email sent to ${params.to} using ${item.name}`);
        return { success: true };
      } catch (err: any) {
        console.warn(`[SMTP WARN] Transport ${item.name} failed:`, err.message);
        lastErrorMsg = err.message || "Error al conectar";
      }
    }

    return {
      success: false,
      error: `Error SMTP (${emailUser}): ${lastErrorMsg}`,
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
