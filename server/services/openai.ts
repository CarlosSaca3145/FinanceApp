import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const apiKey = process.env.OPENAI_API_KEY || "mock-openai-api-key-for-local-dev";
const openai = new OpenAI({ apiKey });

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
    try {
      const prompt = `Generate a professional outreach email for brand partnership/collaboration.

Brand Name: ${options.brandName}
Industry: ${options.industry || 'general'}
Tone: ${options.tone || 'professional'}
Purpose: ${options.purpose || 'outreach'}
${options.additionalContext ? `Additional Context: ${options.additionalContext}` : ''}

Please generate:
1. An engaging subject line
2. Email content that's personalized and professional
3. Keep it concise and actionable

Respond in JSON format with this structure:
{
  "subject": "subject line here",
  "content": "email body here",
  "tone": "${options.tone || 'professional'}"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert email marketing specialist who creates compelling outreach emails for brand partnerships and collaborations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        subject: result.subject || "Partnership Opportunity",
        content: result.content || "Hello! I'd like to discuss a potential partnership opportunity...",
        tone: result.tone || options.tone || 'professional'
      };
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error('Failed to generate email content: ' + (error as Error).message);
    }
  }

  static async generateSubjectLines(brandName: string, purpose: string, count: number = 3): Promise<string[]> {
    try {
      const prompt = `Generate ${count} engaging email subject lines for outreach to "${brandName}".
      
Purpose: ${purpose}
Requirements:
- Professional yet attention-grabbing
- Personalized to the brand
- Avoid spam-trigger words
- Keep under 50 characters when possible

Respond in JSON format:
{
  "subjects": ["subject 1", "subject 2", "subject 3"]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert at creating compelling email subject lines that get opened."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.subjects || [`Partnership with ${brandName}`, `Collaboration Opportunity`, `Let's Work Together`];
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error('Failed to generate subject lines: ' + (error as Error).message);
    }
  }

  static async improveTemplate(currentContent: string, improvements: string): Promise<string> {
    try {
      const prompt = `Improve the following email template based on the requested improvements:

Current Content:
${currentContent}

Requested Improvements:
${improvements}

Please provide an improved version that maintains the original intent while incorporating the requested changes. Keep it professional and engaging.

Respond in JSON format:
{
  "improved_content": "the improved email content here"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert email marketing specialist who improves email templates for better engagement and results."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.improved_content || currentContent;
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error('Failed to improve template: ' + (error as Error).message);
    }
  }

  static async analyzeEmailResponse(emailContent: string): Promise<{ sentiment: string; suggestions: string[] }> {
    try {
      const prompt = `Analyze the following email response and provide insights:

Email Content:
${emailContent}

Please analyze:
1. Overall sentiment (positive, neutral, negative)
2. Key points mentioned
3. Suggestions for follow-up

Respond in JSON format:
{
  "sentiment": "positive/neutral/negative",
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert at analyzing business email communications and providing actionable insights."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        sentiment: result.sentiment || 'neutral',
        suggestions: result.suggestions || ['Consider a follow-up in 1-2 weeks', 'Personalize based on their response']
      };
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error('Failed to analyze email: ' + (error as Error).message);
    }
  }

  static async generateNicheIdeas(niche: string, brandName: string, customSuggestion?: string): Promise<string[]> {
    try {
      const basePrompt = `Generate 2 brief content ideas (2-3 lines each) for ${niche} products from "${brandName}".`;
      
      const prompt = customSuggestion 
        ? `${basePrompt}

User wants ideas based on: "${customSuggestion}"

Create 2 short, specific ideas that incorporate this direction. Keep each idea to 2-3 lines maximum.

Example format:
- "Test the waterproof feature by filming underwater shots in a swimming pool"
- "Create a night photography comparison showing low-light performance vs older models"

Respond in JSON format:
{
  "ideas": ["idea 1 description", "idea 2 description"]
}`

        : `${basePrompt}

Requirements:
- Each idea: 2-3 lines maximum
- Specific, actionable content concepts
- Different approaches (e.g., feature demo vs lifestyle use)

Example: "Test noise cancellation by filming in busy café vs quiet room"

Respond in JSON format:
{
  "ideas": ["idea 1 description", "idea 2 description"]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-5", // Use gpt-5 which supports JSON format
        messages: [
          {
            role: "system",
            content: "Generate brief, specific content ideas. Keep responses concise and actionable."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 300 // Limit tokens for faster response
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.ideas || [
        `Quick ${niche} feature test from ${brandName}`,
        `Real-world ${niche} performance demo`
      ];
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error('Failed to generate niche ideas: ' + (error as Error).message);
    }
  }

  static async generateContentSection(nicheIdea: string, niche: string, brandName: string, selectedVideoLink?: string): Promise<string> {
    try {
      const videoLinkContext = selectedVideoLink ? `
Reference Video: ${selectedVideoLink}
(Use this video as inspiration or reference for the content example)` : '';

      const prompt = `Generate a brief content example section (2-3 sentences) based on this idea:

Idea: "${nicheIdea}"
Niche: ${niche}
Brand: ${brandName}${videoLinkContext}

Create a realistic content example that shows what the creator would post. Keep it:
- Brief (2-3 sentences maximum)
- Specific and actionable
- Professional but engaging
- Include relevant emojis if appropriate
${selectedVideoLink ? '- Reference the video link if relevant to the content idea' : ''}

Example format: "📱 Just tested the new iPhone 15 Pro - the camera quality is incredible! Check out these low-light shots..."

Respond in JSON format:
{
  "content": "your generated content here"
}`

      const response = await openai.chat.completions.create({
        model: "gpt-5", // Use gpt-5 which supports JSON format
        messages: [
          {
            role: "system", 
            content: "Generate brief, engaging content examples for social media posts. Keep responses concise and realistic."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 200 // Limit for faster response
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.content || `${nicheIdea} - Perfect for showcasing ${niche} from ${brandName}!`;
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error('Failed to generate content section: ' + (error as Error).message);
    }
  }

  // Deprecated - keeping for backward compatibility but not used anymore
  static async regenerateEmailWithIdea(options: ContentGenerationOptions, nicheIdea: string): Promise<EmailContentSuggestion> {
    try {
      const contentSection = await this.generateContentSection(nicheIdea, options.industry || 'general', options.brandName);
      
      return {
        subject: `Collaboration ${options.purpose === 'followup' ? 'Follow-up' : ''} — ${options.brandName}`,
        content: contentSection,
        tone: options.tone || 'professional'
      };
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error('Failed to regenerate email with idea: ' + (error as Error).message);
    }
  }

  /**
   * Generates a high-converting sponsorship pitch email using:
   * - Real YouTube video metrics (best match for the brand's niche)
   * - Upcoming video from Notion calendar (for horizontal integration)
   * - The winning 2-option format (Vertical Short + Horizontal 60-90s)
   */
  static async generateSponsorshipPitch(opts: {
    brandName: string;
    brandNiche: string;
    contactName?: string;
    // YouTube reference video (best niche match, vertical/short)
    shortVideo?: {
      title: string;
      url: string;
      viewCount: number;
      thumbnailUrl?: string | null;
      formattedViews: string;
    } | null;
    // YouTube reference video (best niche match, horizontal/long)
    longVideo?: {
      title: string;
      url: string;
      viewCount: number;
      thumbnailUrl?: string | null;
      formattedViews: string;
    } | null;
    // Upcoming Notion video for horizontal integration
    upcomingVideo?: {
      title: string;
      targetDate?: Date | null;
      notionUrl?: string | null;
    } | null;
  }): Promise<{ subject: string; htmlBody: string }> {
    const {
      brandName,
      brandNiche,
      contactName,
      shortVideo,
      longVideo,
      upcomingVideo,
    } = opts;

    const greeting = contactName ? `Hi ${contactName}` : `Hi ${brandName} team`;

    const shortVideoSection = shortVideo
      ? `
- **Opción A – Vídeo Vertical Corto (TikTok + Instagram + YouTube Shorts)**:
  Referencia de nuestro vídeo sobre ${brandNiche} más viral:
  - Título: "${shortVideo.title}"
  - Visualizaciones: **${shortVideo.formattedViews}** views
  - Enlace: ${shortVideo.url}
`
      : `- **Opción A – Vídeo Vertical Corto (TikTok + Instagram + YouTube Shorts)**: Formato multiplataforma, alta visibilidad de ${brandNiche}.`;

    const horizontalSection = upcomingVideo
      ? `
- **Opción B – Integración Horizontal en YouTube (60–90 segundos)**:
  Próximo vídeo agendado donde podemos integrar ${brandName}:
  - Título: "${upcomingVideo.title}"
  ${upcomingVideo.targetDate ? `- Fecha estimada de publicación: ${upcomingVideo.targetDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}` : ""}
  ${longVideo ? `- Referencia histórica del canal: "${longVideo.title}" — ${longVideo.formattedViews} views` : ""}
`
      : longVideo
      ? `
- **Opción B – Integración Horizontal en YouTube (60–90 segundos)**:
  Referencia de nuestro vídeo de mayor alcance:
  - Título: "${longVideo.title}"
  - Visualizaciones: **${longVideo.formattedViews}** views
  - Enlace: ${longVideo.url}
`
      : `- **Opción B – Integración Horizontal en YouTube (60–90 segundos)**: Bloque dedicado en vídeos de alto alcance de nuestro canal.`;

    const prompt = `You are an expert at writing high-converting YouTube creator sponsorship outreach emails.

Generate a professional, natural, and persuasive sponsorship pitch email in Spanish for this creator.

Creator context:
- Greeting: "${greeting}"
- Brand to pitch: ${brandName}
- Brand niche: ${brandNiche}

The email MUST follow this exact 2-option structure (this is the proven format that works):

OPTION A (Short Vertical Video):
${shortVideoSection}
This format: TikTok + Instagram Reels + YouTube Shorts — maximum multi-platform reach.
${shortVideo ? `Show the reference video link and ${shortVideo.formattedViews} views as social proof.` : ''}

OPTION B (Horizontal YouTube Integration, 60–90 seconds):
${horizontalSection}
Integrations are always placed in high-reach videos of the channel.
${upcomingVideo ? `Sell the upcoming video "${upcomingVideo.title}" as a premium slot.` : ''}

Writing rules:
1. Keep it short and punchy — maximum 5 short paragraphs total.
2. Start with a personalized opener referencing the brand's niche (${brandNiche}).
3. Present both options clearly with their metrics/social proof.
4. End with a clear, low-pressure CTA — ask which option interests them most.
5. Tone: professional but warm, like a confident creator who knows their value.
6. Write ENTIRELY in Spanish.
7. Do NOT use placeholder text — be specific and concrete.

Respond ONLY as JSON:
{
  "subject": "email subject line (max 60 chars)",
  "htmlBody": "full HTML email body (use <p>, <strong>, <a> tags, no inline styles)"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are a top-tier YouTube creator partnership manager who writes emails that get responses. Always respond with valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1500,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      subject: result.subject || `Colaboración — ${brandName}`,
      htmlBody: result.htmlBody || `<p>Hola,</p><p>Me gustaría hablar de una colaboración con ${brandName}.</p>`,
    };
  }
}