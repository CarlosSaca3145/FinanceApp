import OpenAI from "openai";

/**
 * Universal AI Caller supporting both Gemini API and OpenAI API with automatic fallback
 */
async function callAICompletion(opts: {
  systemPrompt: string;
  userPrompt: string;
}): Promise<string | null> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAIKey = process.env.OPENAI_API_KEY;

  // 1. Try Gemini API if key exists
  if (geminiKey && !geminiKey.startsWith("mock-")) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `${opts.systemPrompt}\n\nUser request:\n${opts.userPrompt}` }]
          }]
        })
      });
      if (res.ok) {
        const data = await res.json() as any;
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text.trim();
      }
    } catch (e) {
      console.warn("[Gemini API Error]:", (e as Error).message);
    }
  }

  // 2. Try OpenAI API if key exists and isn't mock
  if (openAIKey && !openAIKey.startsWith("mock-")) {
    try {
      const openai = new OpenAI({ apiKey: openAIKey });
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: opts.systemPrompt },
          { role: "user", content: opts.userPrompt }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 1500,
      });
      const content = response.choices[0]?.message?.content;
      if (content) return content;
    } catch (e) {
      console.warn("[OpenAI API Error]:", (e as Error).message);
    }
  }

  return null;
}

export interface EmailContentSuggestion {
  subject: string;
  content: string;
  tone: string;
}

export interface ContentGenerationOptions {
  brandName: string;
  industry?: string;
  tone?: 'professional' | 'casual' | 'friendly' | 'persuasive';
  purpose?: 'outreach' | 'followup' | 'partnership' | 'collaboration';
  additionalContext?: string;
}

export class OpenAIService {
  static async generateEmailContent(options: ContentGenerationOptions): Promise<EmailContentSuggestion> {
    const systemPrompt = "You are an expert email marketing specialist who creates compelling outreach emails for brand partnerships and collaborations. Respond in JSON with keys 'subject', 'content', 'tone'.";
    const userPrompt = `Brand Name: ${options.brandName}
Industry: ${options.industry || 'general'}
Tone: ${options.tone || 'professional'}
Purpose: ${options.purpose || 'outreach'}`;

    const resText = await callAICompletion({ systemPrompt, userPrompt });
    if (resText) {
      try {
        const result = JSON.parse(resText.match(/\{[\s\S]*\}/)?.[0] || resText);
        return {
          subject: result.subject || `Collaboration Opportunity — ${options.brandName}`,
          content: result.content || result.body || "Hello! I'd like to discuss a potential partnership opportunity...",
          tone: result.tone || options.tone || 'professional'
        };
      } catch {}
    }

    return {
      subject: `Propuesta de Colaboración — ${options.brandName}`,
      content: `Hola equipo de ${options.brandName},\n\nNos gustaría ofrecerles una integración en un video de YouTube largo de alto impacto.\n\nQuedo a la espera de sus comentarios.\n\nSaludos,\nCarlos Saca`,
      tone: options.tone || 'professional'
    };
  }

  static async generateSubjectLines(brandName: string, purpose: string, count: number = 3): Promise<string[]> {
    const systemPrompt = `Generate ${count} engaging email subject lines for outreach to "${brandName}". Respond in JSON format: { "subjects": ["subject 1", "subject 2", "subject 3"] }`;
    const userPrompt = `Purpose: ${purpose}`;

    const resText = await callAICompletion({ systemPrompt, userPrompt });
    if (resText) {
      try {
        const result = JSON.parse(resText.match(/\{[\s\S]*\}/)?.[0] || resText);
        if (result.subjects && Array.isArray(result.subjects)) return result.subjects;
      } catch {}
    }

    return [
      `Propuesta de Integración en YouTube — ${brandName}`,
      `Oportunidad de Colaboración Exclusiva — ${brandName}`,
      `Propuesta de Patrocinio Saca Tech / ${brandName}`
    ];
  }

  static async improveTemplate(currentContent: string, improvements: string): Promise<string> {
    const systemPrompt = "Improve the email template based on user request. Respond in JSON format: { \"improved_content\": \"...\" }";
    const userPrompt = `Current Content:\n${currentContent}\n\nImprovements:\n${improvements}`;

    const resText = await callAICompletion({ systemPrompt, userPrompt });
    if (resText) {
      try {
        const result = JSON.parse(resText.match(/\{[\s\S]*\}/)?.[0] || resText);
        if (result.improved_content) return result.improved_content;
      } catch {}
    }

    return currentContent;
  }

  static async analyzeEmailResponse(emailContent: string): Promise<{ sentiment: string; suggestions: string[] }> {
    return {
      sentiment: 'positive',
      suggestions: ['Coordinar detalles de entrega', 'Enviar acuerdo de patrocinio']
    };
  }

  static async generateNicheIdeas(niche: string, brandName: string, customSuggestion?: string): Promise<string[]> {
    return [
      `Prueba de rendimiento de ${niche} en situaciones reales`,
      `Comparativa de características clave de ${brandName}`
    ];
  }

  static async generateContentSection(nicheIdea: string, niche: string, brandName: string, selectedVideoLink?: string): Promise<string> {
    return `${nicheIdea} - Ideal para destacar los productos de ${brandName} en ${niche}!`;
  }

  static async regenerateEmailWithIdea(options: ContentGenerationOptions, nicheIdea: string): Promise<EmailContentSuggestion> {
    return {
      subject: `Propuesta de Colaboración — ${options.brandName}`,
      content: `${nicheIdea}\n\nHola equipo de ${options.brandName},\n\nQuedo a la espera de su respuesta.`,
      tone: 'professional'
    };
  }

  static async generateSponsorshipPitch(opts: {
    brandName: string;
    brandNiche: string;
    contactName?: string;
    shortVideo?: any;
    longVideo?: any;
    upcomingVideo?: any;
  }): Promise<{ subject: string; htmlBody: string }> {
    return {
      subject: `Propuesta de Patrocinio — ${opts.brandName}`,
      htmlBody: `<p>Hola ${opts.contactName || opts.brandName},</p><p>Ofrecemos una integración de alto impacto en YouTube.</p>`,
    };
  }

  /**
   * Generates a smart, personalized email body and subject for proposal
   */
  static async generateSmartEmail(opts: {
    brandName: string;
    brandNiche: string;
    contactName?: string | null;
    campaign?: string | null;
    templateType?: 'general' | 'followup';
    language?: string;
    videos?: Array<{
      title: string;
      views?: string | number | null;
      url?: string | null;
    }>;
    referenceVideoLink?: string | null;
  }): Promise<{ subject: string; body: string }> {
    const {
      brandName,
      brandNiche,
      contactName,
      campaign,
      templateType = 'general',
      language = 'es',
      videos = [],
      referenceVideoLink,
    } = opts;

    const langName = language === 'en' ? 'English' : language === 'pt' ? 'Portuguese' : language === 'de' ? 'German' : 'Spanish';

    const videosListText = videos.length > 0
      ? videos.map((v) => `- "${v.title}"${v.views ? ` (${v.views} views${v.url ? `: ${v.url}` : ''})` : ''}`).join('\n')
      : 'General high-impact long-form video';

    const systemPrompt = `You are Carlos Saca, creator at Saca Tech (@saca.technology).
Write a professional sponsorship pitch email to a brand.
ALWAYS respond strictly in JSON format: { "subject": "...", "body": "..." }.
Language: Write the ENTIRE email in ${langName}.
CRITICAL RULES:
1. NEVER include Notion links (e.g. app.notion.com) or Notion internal IDs under any circumstances.
2. Only include YouTube links (https://www.youtube.com/watch?v=... or https://youtu.be/...) if provided.`;

    const userPrompt = `Contact Name: ${contactName || brandName + ' Team'}
Brand: ${brandName} (${brandNiche})
${campaign && campaign.toLowerCase() !== 'general' ? `Campaign: "${campaign}"` : ''}
Type: ${templateType === 'followup' ? 'Follow-up email' : 'Initial proposal'}
Available Videos offered:
${videosListText}
${referenceVideoLink ? `Reference YouTube link: ${referenceVideoLink}` : ''}`;

    const resText = await callAICompletion({ systemPrompt, userPrompt });
    if (resText) {
      try {
        const jsonMatch = resText.match(/\{[\s\S]*\}/);
        const result = JSON.parse(jsonMatch ? jsonMatch[0] : resText);
        if (result.body && result.subject) {
          const cleanBody = result.body
            .replace(/https?:\/\/app\.notion\.com\/[^\s\n]+/gi, '')
            .replace(/^[0-9a-f]{32}\s*$/gim, '')
            .trim();
          return { subject: result.subject, body: cleanBody };
        }
      } catch {}
    }

    // Fallback template builder if AI API call fails or key is missing
    const salutation = language === 'en' ? `Hi ${contactName || brandName},` :
                       language === 'pt' ? `Olá ${contactName || brandName},` :
                       language === 'de' ? `Hallo ${contactName || brandName},` :
                       `Hola ${contactName || brandName},`;

    const campaignText = campaign ? (
      language === 'en' ? `Regarding your "${campaign}" campaign` :
      language === 'pt' ? `Em relação à sua campanha "${campaign}"` :
      language === 'de' ? `Bezüglich Ihrer Kampagne "${campaign}"` :
      `Respecto a la campaña "${campaign}"`
    ) : (
      language === 'en' ? `Regarding an upcoming sponsorship opportunity` :
      language === 'pt' ? `Em relação a uma oportunidade de patrocínio` :
      language === 'de' ? `Bezüglich einer bevorstehenden Sponsoring-Möglichkeit` :
      `Respecto a la campaña de integración`
    );

    const videoListFormatted = videos.length > 0
      ? videos.map(v => {
          const viewsStr = v.views ? ` (${v.views} views)` : '';
          const urlStr = (v.url && /youtube\.com|youtu\.be/i.test(v.url)) ? `\n  🔗 Link: ${v.url}` : '';
          return `• 🎬 "${v.title}"${urlStr}\n  (${language === 'en' ? 'This video achieved high reach; we project this upcoming video on a similar topic will achieve equal or higher reach.' : 'Este video tuvo un alto alcance de visualizaciones, por lo que entendemos que este que estoy ofreciéndote de temática similar tendrá igual o similar alcance con potencial a ser mayor.'})`;
        }).join('\n\n')
      : `• 🎬 "YouTube Long-Form Integration"`;

    const cta = language === 'en' ? 'Would you be open to a quick call or email exchange to coordinate details?' :
                language === 'pt' ? 'Você estaria disponível para uma rápida ligação ou troca de e-mails para alinhar os detalhes?' :
                language === 'de' ? 'Wären Sie für ein kurzes Telefonat oder einen E-Mail-Austausch offen, um die Details abzustimmen?' :
                'Quedo a la espera de saber si estarías disponible para una breve llamada o responder por este medio para coordinar detalles.';

    const body = `${salutation}\n\n${campaignText}, ${language === 'en' ? 'I am offering an integration in a long-form YouTube video.' : 'estoy ofreciendo una integración en un video de YouTube largo de alto impacto.'}\n\n${language === 'en' ? 'The available videos are:' : 'Los videos que están disponibles son:'}\n\n${videoListFormatted}\n\n${referenceVideoLink && /youtube\.com|youtu\.be/i.test(referenceVideoLink) ? `${language === 'en' ? 'Reference video:' : 'Vídeo de referencia:'}\n🔗 ${referenceVideoLink}\n\n` : ''}${cta}\n\n${language === 'en' ? 'Best regards,' : 'Saludos cordiales,'}\nCarlos Saca\nSaca Tech | @saca.technology`;

    const subject = language === 'en' ? `Sponsorship Proposal — ${brandName}` : `Propuesta de Patrocinio — ${brandName}`;
    return { subject, body };
  }

  /**
   * Refines/rewrites an existing email body according to user custom instructions (Gemini / OpenAI prompt).
   */
  static async refineEmailWithAI(opts: {
    currentBody: string;
    instruction: string;
    brandName?: string;
    language?: string;
  }): Promise<string> {
    const { currentBody, instruction, brandName, language = 'es' } = opts;
    const langName = language === 'en' ? 'English' : language === 'pt' ? 'Portuguese' : language === 'de' ? 'German' : 'Spanish';

    // Clean up input draft
    const cleanedDraft = currentBody
      .replace(/https?:\/\/app\.notion\.com\/[^\s\n]+/gi, '')
      .replace(/^[0-9a-f]{32}\s*$/gim, '')
      .trim();

    const systemPrompt = `You are an expert email editor for YouTube creator sponsorship proposals.
Rewrite and refine the email draft according to the user's specific instruction.
ALWAYS respond strictly in JSON format: { "refinedBody": "the updated email text" }.
Language requirement: Write the ENTIRE email in ${langName}.
CRITICAL RULES:
1. NEVER include Notion URLs (e.g. app.notion.com) or Notion internal IDs under any circumstances.
2. Only include real YouTube URLs (https://www.youtube.com/watch?v=... or https://youtu.be/...).
3. Apply the user's requested instruction faithfully (change tone, shorten, translate, restructure, emphasize points).`;

    const userPrompt = `Instruction: "${instruction}"
Brand Name: ${brandName || 'Target Brand'}

Current Email Draft:
"""
${cleanedDraft}
"""`;

    const aiResult = await callAICompletion({ systemPrompt, userPrompt });
    if (aiResult) {
      try {
        const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : aiResult);
        if (parsed.refinedBody) {
          return parsed.refinedBody
            .replace(/https?:\/\/app\.notion\.com\/[^\s\n]+/gi, '')
            .replace(/^[0-9a-f]{32}\s*$/gim, '')
            .trim();
        }
      } catch {
        if (aiResult.length > 20) {
          return aiResult
            .replace(/https?:\/\/app\.notion\.com\/[^\s\n]+/gi, '')
            .replace(/^[0-9a-f]{32}\s*$/gim, '')
            .trim();
        }
      }
    }

    // ── DYNAMIC RULE-BASED TRANSFORMER FALLBACK ENGINE ──────────────────
    console.warn("[AI Refine Fallback Engine Activated for Instruction]:", instruction);
    let updated = cleanedDraft;
    const instLower = instruction.toLowerCase();

    // 1. Translation handling
    if (instLower.includes("inglés") || instLower.includes("english") || instLower.includes("traducir a inglés")) {
      updated = updated
        .replace(/Hola /g, "Hi ")
        .replace(/Respecto a la campaña /g, "Regarding the campaign ")
        .replace(/estoy ofreciendo una integración en un video de YouTube largo de alto impacto/g, "I am offering a high-impact integration in long-form YouTube content")
        .replace(/Los videos que están disponibles son:/g, "The videos currently available are:")
        .replace(/El video que está disponible es:/g, "The video currently available is:")
        .replace(/Este video tuvo un alto alcance de/g, "This video achieved high reach with")
        .replace(/visualizaciones, por lo que entendemos que este que estoy ofreciéndote de temática similar tendrá igual o similar alcance con potencial a ser mayor\./g, "views; we anticipate that the video I am proposing will achieve equal or higher reach.")
        .replace(/Puedes ver un ejemplo de una integración anterior aquí:/g, "Here is an example from a previous integration:")
        .replace(/Quedo a la espera de saber si estarías disponible para una breve llamada o responder por este medio para coordinar detalles\./g, "Would you be open to a quick call or email exchange to coordinate details?")
        .replace(/Saludos cordiales,/g, "Best regards,");
    } else if (instLower.includes("alemán") || instLower.includes("deutsch") || instLower.includes("german")) {
      updated = updated
        .replace(/Hola /g, "Hallo ")
        .replace(/Respecto a la campaña /g, "Bezüglich der Kampagne ")
        .replace(/Saludos cordiales,/g, "Mit freundlichen Grüßen,");
    } else if (instLower.includes("portugués") || instLower.includes("portugues") || instLower.includes("portuguese")) {
      updated = updated
        .replace(/Hola /g, "Olá ")
        .replace(/Respecto a la campanha /g, "Em relação à campanha ")
        .replace(/Saludos cordiales,/g, "Atenciosamente,");
    }

    // 2. Shortening / Conciseness
    if (instLower.includes("corto") || instLower.includes("short") || instLower.includes("breve") || instLower.includes("resumir")) {
      updated = updated
        .replace(/\(Este video tuvo un alto alcance de [^)]+\)/gi, "(Alto alcance proyectado)")
        .replace(/Quedo a la espera de saber si estarías disponible para una breve llamada o responder por este medio para coordinar detalles\./gi, "¿Disponibles para coordinar detalles esta semana?");
    }

    // 3. Persuasive / Premium Tone
    if (instLower.includes("persuasivo") || instLower.includes("exclusiv") || instLower.includes("impacto") || instLower.includes("premium")) {
      if (!updated.includes("⭐️")) {
        updated = updated.replace(/estoy ofreciendo una integración/gi, "ofrezco un espacio de integración exclusivo de alta conversión");
      }
    }

    // 4. Formal / Professional Tone
    if (instLower.includes("formal") || instLower.includes("profesional")) {
      updated = updated
        .replace(/Hola /g, "Estimado equipo de ")
        .replace(/Saludos cordiales,/g, "Atentamente,");
    }

    // 5. Custom directive injection fallback if no other transform fired
    if (updated === cleanedDraft) {
      updated += `\n\n[Nota de refinamiento: ${instruction}]`;
    }

    return updated;
  }
}