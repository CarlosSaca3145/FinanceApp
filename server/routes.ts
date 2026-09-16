import type { Express } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import { storage } from "./storage";
import { 
  insertBrandSchema, 
  insertContentTemplateSchema, 
  insertFollowupTemplateSchema,
  insertEmailLogSchema 
} from "@shared/schema";
import { sendEmail, generateEmailHTML } from "./services/email";
import { OpenAIService, type ContentGenerationOptions } from "./services/openai";
import { z } from "zod";
import { isAuthenticated } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Auth status route
  app.get("/api/auth/user", (req: any, res) => {
    if (req.isAuthenticated()) {
      return res.json(req.user.claims);
    }
    res.status(401).json({ message: "Not authenticated" });
  });

  // Brands routes
  app.get("/api/brands", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const brands = await storage.getBrands(userId);
      res.json(brands);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch brands" });
    }
  });

  app.post("/api/brands", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const brandData = insertBrandSchema.parse(req.body);
      const brand = await storage.createBrand(userId, brandData);
      res.json(brand);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid brand data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create brand" });
      }
    }
  });

  app.put("/api/brands/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const brandData = req.body;
      const brand = await storage.updateBrand(id, userId, brandData);
      
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }
      
      res.json(brand);
    } catch (error) {
      res.status(500).json({ error: "Failed to update brand" });
    }
  });

  app.delete("/api/brands/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const success = await storage.deleteBrand(id, userId);
      
      if (!success) {
        return res.status(404).json({ error: "Brand not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error(`Error deleting brand ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to delete brand" });
    }
  });
  
  app.post("/api/brands/bulk-update", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { ids, data } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "Invalid brand IDs" });
      }
      
      const updatedBrands = [];
      for (const id of ids) {
        const brand = await storage.updateBrand(id, userId, data);
        if (brand) updatedBrands.push(brand);
      }
      
      res.json({ success: true, count: updatedBrands.length });
    } catch (error) {
      console.error("Error performing bulk update:", error);
      res.status(500).json({ error: "Failed to perform bulk update" });
    }
  });

  app.get("/api/brands/niches", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const niches = await storage.getUniqueNiches(userId);
      res.json(niches);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch niches" });
    }
  });

  // Get predefined campaigns
  app.get("/api/brands/campaigns", isAuthenticated, async (req: any, res) => {
    try {
      const campaigns = [
        "IFA",
        "MWC", 
        "iPhone",
        "Samsung",
        "BlackFriday",
        "NewYear",
        "NewLaunch"
      ];
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  // Add new niche
  app.post("/api/brands/niches", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { nicho, niche, name } = req.body;
      
      // Accept nicho (Spanish), niche (English), or name for compatibility
      const nicheValue = nicho || niche || name;
      
      if (!nicheValue || typeof nicheValue !== 'string') {
        console.log("Failed to add niche - no valid niche name provided:", req.body);
        return res.status(400).json({ error: "Niche name is required" });
      }

      console.log("Adding new niche:", nicheValue);

      // Get existing niches to check for duplicates
      const existingNiches = await storage.getUniqueNiches(userId);
      if (existingNiches.some(n => n.toLowerCase() === nicheValue.trim().toLowerCase())) {
        return res.status(409).json({ error: "Niche already exists" });
      }

      // Create a placeholder content template for the new niche to ensure it appears in the niches list
      try {
        await storage.createContentTemplate(userId, {
          nicho: nicheValue.trim(),
          contenido: `Template for ${nicheValue.trim()} niche`,
          idea: `Content ideas for ${nicheValue.trim()}`,
          videoLinks: [],
          videoTitles: [],
          fullTemplate: null,
          originalIdea: null,
          proposedIdea: null,
          views: null
        });
      } catch (error) {
        // Template might already exist, that's ok
        console.log(`Content template for ${nicheValue} might already exist`);
      }

      const updatedNiches = await storage.getUniqueNiches(userId);
      res.json({ nicho: nicheValue.trim(), niches: updatedNiches });
    } catch (error) {
      console.error("Error adding niche:", error);
      res.status(500).json({ error: "Failed to add niche" });
    }
  });

  // Rename niche
  app.put("/api/brands/niches", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { oldNiche, newNiche } = req.body;

      if (!oldNiche || !newNiche || typeof oldNiche !== 'string' || typeof newNiche !== 'string') {
        return res.status(400).json({ error: "Both oldNiche and newNiche names are required" });
      }

      const trimmedOld = oldNiche.trim();
      const trimmedNew = newNiche.trim();

      if (trimmedOld.toLowerCase() === trimmedNew.toLowerCase()) {
        return res.status(400).json({ error: "Niche names must be different" });
      }

      console.log(`Renaming niche from "${trimmedOld}" to "${trimmedNew}" for user ${userId}`);

      const existingNiches = await storage.getUniqueNiches(userId);
      if (existingNiches.some(n => n.toLowerCase() === trimmedNew.toLowerCase())) {
        return res.status(409).json({ error: "Target niche name already exists" });
      }

      await storage.renameNiche(userId, trimmedOld, trimmedNew);

      const updatedNiches = await storage.getUniqueNiches(userId);
      res.json({ success: true, oldNiche: trimmedOld, newNiche: trimmedNew, niches: updatedNiches });
    } catch (error) {
      console.error("Error renaming niche:", error);
      res.status(500).json({ error: "Failed to rename niche" });
    }
  });

  app.post("/api/content-templates/import-excel", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { videoLinks, ideas } = req.body;
      
      console.log("Received import data:", { videoLinks: videoLinks?.length || 0, ideas: ideas?.length || 0 });
      
      // Group imported data by niche
      const nicheData: { [niche: string]: { videoLinks: any[], ideas: string[] } } = {};
      
      if (videoLinks && Array.isArray(videoLinks)) {
        videoLinks.forEach((item: any) => {
          if (item.niche) {
            if (!nicheData[item.niche]) {
              nicheData[item.niche] = { videoLinks: [], ideas: [] };
            }
            nicheData[item.niche].videoLinks.push(item);
          }
        });
      }
      
      if (ideas && Array.isArray(ideas)) {
        ideas.forEach((item: any) => {
          if (item.niche) {
            if (!nicheData[item.niche]) {
              nicheData[item.niche] = { videoLinks: [], ideas: [] };
            }
            nicheData[item.niche].ideas.push(item.idea);
          }
        });
      }
      
      let updated = 0;
      let created = 0;
      
      for (const [niche, data] of Object.entries(nicheData)) {
        try {
          // Check if template exists
          const existingTemplates = await storage.getContentTemplates(userId);
          const existingTemplate = existingTemplates.find((t: any) => 
            t.nicho.toLowerCase() === niche.toLowerCase()
          );
          
          if (existingTemplate) {
            // Update existing template
            const updateData: any = {};
            
            if (data.videoLinks.length > 0) {
              const newLinks = data.videoLinks.map(v => v.link);
              const newTitles = data.videoLinks.map(v => v.title || '');
              const newIdeas = data.videoLinks.map(v => v.ideas || '');
              const newViews = data.videoLinks.map(v => v.views || '');
              
              updateData.videoLinks = [...(existingTemplate.videoLinks || []), ...newLinks];
              updateData.videoTitles = [...(existingTemplate.videoTitles || []), ...newTitles];
              updateData.videoIdeas = [...(existingTemplate.videoIdeas || []), ...newIdeas];
              updateData.videoViews = [...(existingTemplate.videoViews || []), ...newViews];
            }
            
            if (data.ideas.length > 0) {
              const newIdeasText = data.ideas.map(idea => `• In order to achieve good reach with your product, I propose the following content idea: "${idea}"`).join('\n');
              updateData.idea = existingTemplate.idea ? `${existingTemplate.idea}\n${newIdeasText}` : newIdeasText;
            }
            
            await storage.updateContentTemplate(existingTemplate.id, userId, updateData);
            updated++;
            console.log(`Updated template for niche: ${niche}`);
          } else {
            // Create new template
            const templateData: any = {
              nicho: niche,
              contenido: `Content for ${niche}`,
              idea: '',
              videoLinks: [],
              videoTitles: [],
              videoIdeas: [],
              videoViews: [],
              fullTemplate: null,
              originalIdea: null,
              proposedIdea: null,
              views: null
            };
            
            if (data.videoLinks.length > 0) {
              templateData.videoLinks = data.videoLinks.map(v => v.link);
              templateData.videoTitles = data.videoLinks.map(v => v.title || '');
              templateData.videoIdeas = data.videoLinks.map(v => v.ideas || '');
              templateData.videoViews = data.videoLinks.map(v => v.views || '');
            }
            
            if (data.ideas.length > 0) {
              templateData.idea = data.ideas.map(idea => `• In order to achieve good reach with your product, I propose the following content idea: "${idea}"`).join('\n');
            }
            
            await storage.createContentTemplate(userId, templateData);
            created++;
            console.log(`Created new template for niche: ${niche}`);
          }
        } catch (error) {
          console.error(`Error processing template for ${niche}:`, error);
        }
      }
      
      res.json({ 
        message: "Templates imported successfully", 
        updated, 
        created,
        total: Object.keys(nicheData).length,
        totalVideoLinks: videoLinks?.length || 0,
        totalIdeas: ideas?.length || 0
      });
    } catch (error) {
      console.error("Import error:", error);
      res.status(500).json({ error: "Failed to import templates" });
    }
  });

  // Content Templates routes
  app.get("/api/content-templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const templates = await storage.getContentTemplates(userId);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch content templates" });
    }
  });

  app.post("/api/content-templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const templateData = insertContentTemplateSchema.parse(req.body);
      const template = await storage.createContentTemplate(userId, templateData);
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid template data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create template" });
      }
    }
  });

  app.put("/api/content-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const templateData = req.body;
      const template = await storage.updateContentTemplate(id, userId, templateData);
      
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  app.patch("/api/content-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const templateData = req.body;
      
      console.log(`[PATCH] Updating template ${id} with data:`, JSON.stringify(templateData, null, 2));
      
      const template = await storage.updateContentTemplate(id, userId, templateData);
      
      if (!template) {
        console.log(`[PATCH] Template ${id} not found`);
        return res.status(404).json({ error: "Template not found" });
      }
      
      console.log(`[PATCH] Template ${template.id} updated successfully. New videoLinks:`, template.videoLinks);
      console.log(`[PATCH] Template ${template.id} updated successfully. New videoIdeas:`, template.videoIdeas);
      
      res.json(template);
    } catch (error) {
      console.error(`[PATCH] Error updating template:`, error);
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  app.delete("/api/content-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const success = await storage.deleteContentTemplate(id, userId);
      
      if (!success) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  // Followup Templates routes
  app.get("/api/followup-templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const templates = await storage.getFollowupTemplates(userId);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch followup templates" });
    }
  });

  app.post("/api/followup-templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const templateData = insertFollowupTemplateSchema.parse(req.body);
      const template = await storage.createFollowupTemplate(userId, templateData);
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid template data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create template" });
      }
    }
  });

  // Generate follow-up with AI
  app.post("/api/generate-followup", isAuthenticated, async (req: any, res) => {
    try {
      const { prompt } = req.body;
      
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: "Prompt is required" });
      }

      // Use OpenAI integration to generate follow-up
      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const systemPrompt = `You are a professional email follow-up expert. Generate a polite, professional follow-up email based on the user's requirements. The follow-up should be:
      1. Professional and courteous
      2. Brief but effective  
      3. Include a gentle reminder about the previous email
      4. Express continued interest in collaboration
      5. Maintain a positive tone
      
      Respond with JSON in this format: { "followup": "the generated follow-up message" }`;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 500,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No content generated");
      }
      
      const result = JSON.parse(content);
      res.json({ followup: result.followup });
    } catch (error) {
      console.error("Error generating follow-up:", error);
      res.status(500).json({ error: "Failed to generate follow-up" });
    }
  });

  // Generate content idea with AI
  app.post("/api/generate-idea", isAuthenticated, async (req: any, res) => {
    try {
      const { niche, prompt } = req.body;
      
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: "Prompt is required" });
      }
      
      if (!niche || typeof niche !== 'string') {
        return res.status(400).json({ error: "Niche is required" });
      }

      // Use OpenAI integration to generate content idea
      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const systemPrompt = `You are a creative content specialist who generates engaging content ideas for brand partnerships and campaigns. Generate a specific, actionable content idea based on the user's requirements for the ${niche} niche. The idea should be:
      1. Creative and engaging
      2. Suitable for the ${niche} industry
      3. Practical and achievable
      4. Brand-friendly for partnerships
      5. Clear and concise (2-3 sentences maximum)
      
      Respond with JSON in this format: { "idea": "the generated content idea" }`;

      const response = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content generated");
      }
      
      const result = JSON.parse(content);
      res.json({ idea: result.idea });
    } catch (error) {
      console.error("Error generating idea:", error);
      res.status(500).json({ error: "Failed to generate idea" });
    }
  });

  // Email sending route
  app.post("/api/send-email", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { brandId, templateType, subjectOverride, htmlOverride, nicheIdeaUsed, to } = req.body;
      
      const brand = await storage.getBrand(brandId, userId);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }

      // Validate that the brand has an email address
      const recipient = to || brand.correo;
      if (!recipient || !recipient.trim()) {
        return res.status(400).json({ error: "Brand does not have a valid email address" });
      }

      const logId = randomUUID();
      const protocol = req.headers["x-forwarded-proto"] || req.protocol;
      const host = req.get("host");
      const baseUrl = `${protocol}://${host}`;
      const trackingImg = `<img src="${baseUrl}/api/track-open/${logId}" width="1" height="1" style="display:none;" />`;

      let htmlBody = "";
      let subject = "";

      // Use AI-generated content if provided, otherwise use templates
      if (htmlOverride && subjectOverride) {
        htmlBody = htmlOverride;
        subject = subjectOverride;
      } else {
        if (templateType === "followup") {
          const followupTemplates = await storage.getFollowupTemplates(userId);
          const followupTemplate = followupTemplates[0]; // Use first available template
          
          if (followupTemplate) {
            const seguimientoHTML = `<p>${followupTemplate.template.replace(/{{contacto}}/g, brand.contacto || "")}</p>`;
            htmlBody = generateEmailHTML(
              brand.contacto || "",
              brand.marca,
              brand.nicho,
              "seguimiento de correo",
              "",
              seguimientoHTML,
              undefined, // videoLink
              undefined, // views
              undefined  // contentIdea
            );
          }
          subject = `Follow-up: Collaboration — ${brand.marca}`;
        } else {
          // Regular collaboration email
          const contentTemplate = await storage.getContentTemplateByNiche(userId, brand.nicho);
          const contenidoTexto = contentTemplate?.contenido || "";
          
          // Get first video link and views from template
          const videoLink = contentTemplate?.videoLinks?.[0] || "";
          const views = contentTemplate?.views || "";
          const contentIdea = contentTemplate?.idea || "";
          
          htmlBody = generateEmailHTML(
            brand.contacto || "",
            brand.marca,
            brand.nicho,
            brand.campania || "",
            contenidoTexto,
            undefined, // seguimientoHTML
            videoLink,
            views,
            contentIdea
          );
          subject = `Collaboration ${brand.campania || ""} — ${brand.marca}`;
        }
      }

      const emailResult = await sendEmail({
        to: recipient,
        subject,
        htmlBody: htmlBody + trackingImg,
        name: "Saca Tech",
        from: "c@saca.technology",
      });

      if (emailResult.success) {
        // Update brand status
        await storage.updateBrand(brandId, userId, {
          estado: "✅ Enviado",
          fechaEnvio: new Date(),
        });

        // Log the email with additional AI context
        await storage.createEmailLog(userId, {
          id: logId,
          brandId,
          recipient,
          subject,
          htmlBody,
          status: "sent",
          ...(nicheIdeaUsed && { error: `AI Niche Idea Used: ${nicheIdeaUsed}` }) // Store niche idea in error field as context
        });

        res.json({ success: true, message: `Email sent to ${brand.contacto || recipient}` });
      } else {
        // Log the failed email
        await storage.createEmailLog(userId, {
          id: logId,
          brandId,
          recipient,
          subject,
          htmlBody,
          status: "failed",
          error: emailResult.error,
        });

        res.status(500).json({ error: `Failed to send email: ${emailResult.error}` });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Email open tracking route (Public endpoint)
  app.get("/api/track-open/:logId", async (req, res) => {
    const { logId } = req.params;
    try {
      await storage.registerEmailOpen(logId);
    } catch (error) {
      console.error(`Error registering email open for log ${logId}:`, error);
    }

    // Return a 1x1 transparent GIF
    const pixel = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
    res.writeHead(200, {
      "Content-Type": "image/gif",
      "Content-Length": pixel.length,
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      "Pragma": "no-cache",
      "Expires": "0",
    });
    res.end(pixel);
  });

  // Email logs route
  app.get("/api/email-logs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const logs = await storage.getEmailLogs(userId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch email logs" });
    }
  });

  // AI Content Generation routes
  app.post("/api/ai/generate-email", isAuthenticated, async (req: any, res) => {
    try {
      const { brandName, industry, tone, purpose, additionalContext } = req.body;
      
      const options: ContentGenerationOptions = {
        brandName,
        industry,
        tone,
        purpose,
        additionalContext
      };
      
      const content = await OpenAIService.generateEmailContent(options);
      res.json(content);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate email content: " + (error as Error).message });
    }
  });

  app.post("/api/ai/generate-subjects", isAuthenticated, async (req: any, res) => {
    try {
      const { brandName, purpose, count = 3 } = req.body;
      
      const subjects = await OpenAIService.generateSubjectLines(brandName, purpose, count);
      res.json({ subjects });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate subject lines: " + (error as Error).message });
    }
  });

  app.post("/api/ai/improve-template", isAuthenticated, async (req: any, res) => {
    try {
      const { currentContent, improvements } = req.body;
      
      const improvedContent = await OpenAIService.improveTemplate(currentContent, improvements);
      res.json({ improvedContent });
    } catch (error) {
      res.status(500).json({ error: "Failed to improve template: " + (error as Error).message });
    }
  });

  app.post("/api/ai/analyze-response", isAuthenticated, async (req: any, res) => {
    try {
      const { emailContent } = req.body;
      
      const analysis = await OpenAIService.analyzeEmailResponse(emailContent);
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ error: "Failed to analyze email: " + (error as Error).message });
    }
  });

  app.post("/api/ai/generate-niche-ideas", isAuthenticated, async (req: any, res) => {
    try {
      const { niche, brandName, customSuggestion } = req.body;
      
      const ideas = await OpenAIService.generateNicheIdeas(niche, brandName, customSuggestion);
      res.json({ ideas });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate niche ideas: " + (error as Error).message });
    }
  });

  app.post("/api/ai/regenerate-email", isAuthenticated, async (req: any, res) => {
    try {
      const { brandName, industry, nicheIdea, selectedVideoLink } = req.body;
      
      // Generate only the content section, not the full email
      const contentSection = await OpenAIService.generateContentSection(nicheIdea, industry, brandName, selectedVideoLink);
      
      res.json({ 
        content: contentSection,
        subject: `Collaboration — ${brandName}`
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to regenerate email: " + (error as Error).message });
    }
  });

  // Import routes
  app.post("/api/import/brands", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const importSchema = z.object({
        items: z.array(insertBrandSchema)
      });
      
      const { items } = importSchema.parse(req.body);
      const createdBrands = await storage.createManyBrands(userId, items);
      
      res.json({
        success: true,
        created: createdBrands.length,
        brands: createdBrands
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid brand data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to import brands: " + (error as Error).message });
      }
    }
  });

  app.post("/api/import/niche-assets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const importSchema = z.object({
        items: z.array(z.object({
          nicho: z.string(),
          idea: z.string().optional(),
          videoLinks: z.array(z.string()).optional()
        }))
      });
      
      const { items } = importSchema.parse(req.body);
      const results = [];
      
      for (const item of items) {
        const template = await storage.upsertContentTemplateByNiche(userId, item.nicho, {
          idea: item.idea,
          videoLinks: item.videoLinks
        });
        results.push(template);
      }
      
      res.json({
        success: true,
        processed: results.length,
        templates: results
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid niche asset data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to import niche assets: " + (error as Error).message });
      }
    }
  });

  // Dashboard stats route
  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const brands = await storage.getBrands(userId);
      const emailLogs = await storage.getEmailLogs(userId);

      const totalBrands = brands.length;
      const emailsSent = emailLogs.filter(log => log.status === "sent").length;
      const responsesReceived = brands.filter(brand => brand.estado === "Responded").length;
      const activeCampaigns = new Set(brands.map(brand => brand.campania).filter(Boolean)).size;
      
      const responseRate = emailsSent > 0 ? ((responsesReceived / emailsSent) * 100).toFixed(1) : "0";
      
      // Calculate Open Rate
      const openedEmails = emailLogs.filter(log => log.opened).length;
      const openRate = emailsSent > 0 ? ((openedEmails / emailsSent) * 100).toFixed(1) : "0";

      // Calculate recent activities (last 5 sent/opened email logs)
      const sortedLogs = [...emailLogs].sort((a, b) => {
        const dateA = a.sentAt ? new Date(a.sentAt).getTime() : 0;
        const dateB = b.sentAt ? new Date(b.sentAt).getTime() : 0;
        return dateB - dateA;
      }).slice(0, 5);

      const recentActivities = sortedLogs.map(log => {
        const brand = brands.find(b => b.id === log.brandId);
        return {
          id: log.id,
          brandName: brand?.marca || "Unknown Brand",
          recipient: log.recipient,
          status: log.status,
          sentAt: log.sentAt,
          opened: log.opened,
          openedAt: log.openedAt,
        };
      });

      // Calculate campaign performance
      const campaignMap: Record<string, { sent: number; opened: number }> = {};
      for (const log of emailLogs) {
        if (log.status !== "sent") continue;
        const brand = brands.find(b => b.id === log.brandId);
        const campaign = brand?.campania || "General";
        if (!campaignMap[campaign]) {
          campaignMap[campaign] = { sent: 0, opened: 0 };
        }
        campaignMap[campaign].sent++;
        if (log.opened) {
          campaignMap[campaign].opened++;
        }
      }

      const campaignPerformance = Object.entries(campaignMap).map(([name, data]) => {
        const rate = data.sent > 0 ? ((data.opened / data.sent) * 100).toFixed(0) : "0";
        return {
          name,
          sent: data.sent,
          openRate: `${rate}%`,
        };
      }).sort((a, b) => b.sent - a.sent).slice(0, 5);

      res.json({
        totalBrands,
        emailsSent,
        responseRate: `${responseRate}%`,
        openRate: `${openRate}%`,
        activeCampaigns,
        recentActivities,
        campaignPerformance,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Sync email replies route
  app.post("/api/brands/sync-replies", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { syncIncomingReplies } = await import("./services/imap");
      const result = await syncIncomingReplies(userId);
      res.json(result);
    } catch (error: any) {
      console.error("Error syncing email replies:", error);
      res.status(500).json({ error: "Failed to sync email replies: " + error.message });
    }
  });

  // Start background poller to sync email replies automatically every 5 minutes
  setInterval(async () => {
    try {
      const { syncIncomingReplies } = await import("./services/imap");
      const targetUserId = "116630391775518035940"; // Sync for main local user
      console.log("[POLLED SYNC] Automatically checking for brand replies...");
      await syncIncomingReplies(targetUserId);
    } catch (err) {
      console.error("[POLLED SYNC] Error in background poller:", err);
    }
  }, 5 * 60 * 1000);

  // ─── Integrations Config ────────────────────────────────────────────────────
  // GET current config
  app.get("/api/integrations/config", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const config = await storage.getIntegrationsConfig(userId);
      // Never return raw API keys – mask them
      if (config) {
        res.json({
          youtubeChannelId: config.youtubeChannelId,
          youtubeApiKey: config.youtubeApiKey ? "••••••••••" : null,
          notionToken: config.notionToken ? "••••••••••" : null,
          notionDatabaseId: config.notionDatabaseId,
          notionTitleProperty: config.notionTitleProperty,
          notionDateProperty: config.notionDateProperty,
          notionStatusProperty: config.notionStatusProperty,
          notionNicheProperty: config.notionNicheProperty,
          hasYoutube: !!(config.youtubeApiKey && config.youtubeChannelId),
          hasNotion: !!(config.notionToken && config.notionDatabaseId),
        });
      } else {
        res.json({ hasYoutube: false, hasNotion: false });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch integrations config" });
    }
  });

  // SAVE config
  app.post("/api/integrations/config", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { extractNotionDatabaseId } = await import("./services/notion");
      const body = { ...req.body };
      if (body.notionDatabaseId) {
        body.notionDatabaseId = extractNotionDatabaseId(body.notionDatabaseId);
      }
      const config = await storage.upsertIntegrationsConfig(userId, body);
      res.json({ success: true, hasYoutube: !!(config.youtubeApiKey && config.youtubeChannelId), hasNotion: !!(config.notionToken && config.notionDatabaseId) });
    } catch (error) {
      res.status(500).json({ error: "Failed to save integrations config" });
    }
  });

  // ─── YouTube Sync ────────────────────────────────────────────────────────────
  app.post("/api/integrations/youtube/sync", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const config = await storage.getIntegrationsConfig(userId);
      if (!config?.youtubeApiKey || !config?.youtubeChannelId) {
        return res.status(400).json({ error: "YouTube API Key and Channel ID are required. Configure them in Integrations settings." });
      }

      const { YouTubeService } = await import("./services/youtube");
      const yt = new YouTubeService(config.youtubeApiKey, config.youtubeChannelId);
      const videos = await yt.syncChannelVideos();

      // Upsert all videos into DB
      let synced = 0;
      for (const v of videos) {
        await storage.upsertYoutubeVideo(userId, v);
        synced++;
      }

      res.json({ success: true, synced, total: videos.length });
    } catch (error: any) {
      console.error("YouTube sync error:", error);
      res.status(500).json({ error: "YouTube sync failed: " + error.message });
    }
  });

  // GET synced YouTube videos (optionally filtered by niche & isShort)
  app.get("/api/integrations/youtube/videos", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { niche, isShort } = req.query;
      const videos = await storage.getYoutubeVideos(userId, {
        niche: niche as string | undefined,
        isShort: isShort === "true" ? true : isShort === "false" ? false : undefined,
      });
      res.json(videos);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch YouTube videos" });
    }
  });

  // GET best matching YouTube video for a niche
  app.get("/api/integrations/youtube/best-match", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { niche } = req.query;
      if (!niche) return res.status(400).json({ error: "niche is required" });

      const { YouTubeService, formatViews } = await import("./services/youtube");
      const allDbVideos = await storage.getYoutubeVideos(userId);
      const allVideos = allDbVideos.map(v => ({
        ...v,
        viewCount: v.viewCount ?? 0,
        likeCount: v.likeCount ?? 0,
        commentCount: v.commentCount ?? 0,
        tags: v.tags ?? [],
        isShort: v.isShort ?? false,
      }));

      const shortMatch = YouTubeService.findBestMatchForNiche(allVideos, niche as string, true);
      const longMatch = YouTubeService.findBestMatchForNiche(allVideos, niche as string, false);

      res.json({
        shortVideo: shortMatch ? { ...shortMatch, formattedViews: formatViews(shortMatch.viewCount) } : null,
        longVideo: longMatch ? { ...longMatch, formattedViews: formatViews(longMatch.viewCount) } : null,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to find best YouTube match" });
    }
  });

  // ─── Notion Sync ─────────────────────────────────────────────────────────────
  app.post("/api/integrations/notion/sync", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const config = await storage.getIntegrationsConfig(userId);
      if (!config?.notionToken || !config?.notionDatabaseId) {
        return res.status(400).json({ error: "Token e ID de Notion requeridos. Configúralos en ajustes de integraciones." });
      }

      const { NotionService } = await import("./services/notion");
      const notion = new NotionService({
        token: config.notionToken,
        databaseId: config.notionDatabaseId,
        titleProperty: config.notionTitleProperty || "Name",
        dateProperty: config.notionDateProperty || "Date",
        statusProperty: config.notionStatusProperty || "Status",
        nicheProperty: config.notionNicheProperty || "Niche",
      });

      const videos = await notion.getUpcomingVideos();
      await storage.clearNotionVideos(userId);
      let synced = 0;
      for (const v of videos) {
        await storage.upsertNotionVideo(userId, v);
        synced++;
      }

      res.json({ success: true, synced, total: videos.length, videos });
    } catch (error: any) {
      console.error("Notion sync error:", error);
      res.status(500).json({ error: "Error en la sincronización con Notion: " + (error.message || "Asegúrate de agregar la integración en Notion ('...' -> 'Conexiones')") });
    }
  });

  // GET synced Notion upcoming videos (STRICTLY Future & Unscheduled)
  app.get("/api/integrations/notion/videos", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const videos = await storage.getNotionVideos(userId);

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const finishedStatuses = [
        "published", "publicado", "done", "completado", "finalizado", 
        "terminado", "archived", "archivado", "listo", "posted", 
        "subido", "youtube", "grabado", "editado", "released"
      ];

      const upcomingOnly = videos.filter(v => {
        // 1. Exclude any finished / published status
        const statusLower = (v.status || "").toLowerCase();
        const isFinished = finishedStatuses.some(s => statusLower.includes(s));
        if (isFinished) return false;

        // 2. Exclude past target dates
        if (v.targetDate) {
          const d = new Date(v.targetDate);
          if (d < startOfToday) return false;
        }

        return true;
      });

      res.json(upcomingOnly);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch Notion videos" });
    }
  });

  // ─── AI Sponsorship Pitch Generator ─────────────────────────────────────────
  app.post("/api/ai/generate-pitch", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { brandName, brandNiche, contactName, shortVideoId, longVideoId, notionVideoId } = req.body;

      if (!brandName || !brandNiche) {
        return res.status(400).json({ error: "brandName and brandNiche are required" });
      }

      const { YouTubeService, formatViews } = await import("./services/youtube");
      const { NotionService } = await import("./services/notion");

      // Load all videos to find best matches — normalize nullables from DB
      const allDbYtVideos = await storage.getYoutubeVideos(userId);
      const allYtVideos = allDbYtVideos.map(v => ({
        ...v,
        viewCount: v.viewCount ?? 0,
        likeCount: v.likeCount ?? 0,
        commentCount: v.commentCount ?? 0,
        tags: v.tags ?? [],
        isShort: v.isShort ?? false,
      }));

      type PitchVideo = { title: string; url: string; viewCount: number; thumbnailUrl?: string | null; formattedViews: string } | null;
      let shortVideo: PitchVideo = null;
      let longVideo: PitchVideo = null;
      let upcomingVideo = null;

      if (shortVideoId) {
        const v = allYtVideos.find(v => v.youtubeId === shortVideoId);
        if (v) shortVideo = { title: v.title, url: v.url, viewCount: v.viewCount, thumbnailUrl: v.thumbnailUrl, formattedViews: formatViews(v.viewCount) };
      } else {
        const match = YouTubeService.findBestMatchForNiche(allYtVideos, brandNiche, true);
        if (match) shortVideo = { title: match.title, url: match.url, viewCount: match.viewCount, thumbnailUrl: match.thumbnailUrl, formattedViews: formatViews(match.viewCount) };
      }

      if (longVideoId) {
        const v = allYtVideos.find(v => v.youtubeId === longVideoId);
        if (v) longVideo = { title: v.title, url: v.url, viewCount: v.viewCount, thumbnailUrl: v.thumbnailUrl, formattedViews: formatViews(v.viewCount) };
      } else {
        const match = YouTubeService.findBestMatchForNiche(allYtVideos, brandNiche, false);
        if (match) longVideo = { title: match.title, url: match.url, viewCount: match.viewCount, thumbnailUrl: match.thumbnailUrl, formattedViews: formatViews(match.viewCount) };
      }

      if (notionVideoId) {
        const v = await storage.getNotionVideo(userId, notionVideoId);
        if (v) upcomingVideo = { notionPageId: v.notionPageId, title: v.title, nicho: v.nicho, targetDate: v.targetDate, sponsorshipAvailable: v.sponsorshipAvailable ?? true, status: v.status ?? 'Planned', notionUrl: v.notionUrl };
      } else {
        const allNotionDb = await storage.getNotionVideos(userId);
        const notionVideos = allNotionDb.map(v => ({ ...v, sponsorshipAvailable: v.sponsorshipAvailable ?? true, status: v.status ?? 'Planned' }));
        upcomingVideo = NotionService.findBestUpcomingForNiche(notionVideos, brandNiche);
      }

      const pitch = await OpenAIService.generateSponsorshipPitch({
        brandName,
        brandNiche,
        contactName,
        shortVideo,
        longVideo,
        upcomingVideo,
      });

      res.json({
        ...pitch,
        shortVideo,
        longVideo,
        upcomingVideo,
      });
    } catch (error: any) {
      console.error("Pitch generation error:", error);
      res.status(500).json({ error: "Failed to generate pitch: " + error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
