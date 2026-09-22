import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { sendEmailToBrand, getContentTemplates, apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles, RefreshCw, Calendar, Video, Send, ChevronRight,
  ExternalLink, Eye, ArrowRight, Wand2, Check, Copy, Mail,
  Star, Languages, CheckSquare, Square, Bot
} from "lucide-react";
import type { Brand } from "@shared/schema";
import { formatDate } from "@/lib/date-utils";

interface NotionVideo {
  id?: string;
  notionPageId: string;
  title: string;
  nicho: string | null;
  targetDate: string | Date | null;
  sponsorshipAvailable: boolean;
  status: string;
  notionUrl: string | null;
  isSold?: boolean;
}

interface EmailComposerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand: Brand | null;
}

export function EmailComposerModal({ open, onOpenChange, brand }: EmailComposerModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Core state ────────────────────────────────────────────────────────
  const [templateType, setTemplateType] = useState<"general" | "followup">("general");
  const [emailLanguage, setEmailLanguage] = useState<string>("es");
  const [customSubject, setCustomSubject] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [editedEmailBody, setEditedEmailBody] = useState("");

  // ── Multi-Video Selection State ────────────────────────────────────────
  const [selectedNotionVideoIds, setSelectedNotionVideoIds] = useState<string[]>([]);
  const [selectedYoutubeId, setSelectedYoutubeId] = useState<string>("auto");
  const [selectedVideoLink, setSelectedVideoLink] = useState("");

  // ── AI Refinement & Templates State ─────────────────────────────────────
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [isGeneratingFullEmail, setIsGeneratingFullEmail] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [isRefiningEmail, setIsRefiningEmail] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [emailGenerated, setEmailGenerated] = useState(false);

  // ── UI state ──────────────────────────────────────────────────────────
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  // ── Data queries ──────────────────────────────────────────────────────
  const { data: notionVideos = [] } = useQuery<NotionVideo[]>({
    queryKey: ["/api/integrations/notion/videos"],
    queryFn: async () => {
      const res = await fetch("/api/integrations/notion/videos", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  const { data: contentTemplates = [] } = useQuery({
    queryKey: ["/api/content-templates"],
    queryFn: () => import("@/lib/api").then(m => m.getContentTemplatesTyped()),
    enabled: open && !!brand,
  });

  // Available (non-sold) videos
  const availableVideos = useMemo(() => {
    return notionVideos.filter(v =>
      !v.isSold && v.sponsorshipAvailable && !(v.status && /vendido|patrocinado|sold|sponsored/i.test(v.status))
    );
  }, [notionVideos]);

  // Derived selected videos array
  const selectedVideos = useMemo(() => {
    if (!availableVideos.length) return [];
    if (selectedNotionVideoIds.length > 0) {
      return availableVideos.filter(v =>
        selectedNotionVideoIds.includes(v.notionPageId) || (v.id && selectedNotionVideoIds.includes(v.id))
      );
    }
    // Default auto-select: first matching niche, or first video
    if (brand) {
      const brandNicheLower = (brand.nicho || "").toLowerCase();
      const nicheMatch = availableVideos.find(v =>
        (v.nicho && v.nicho.toLowerCase().includes(brandNicheLower)) ||
        v.title.toLowerCase().includes(brandNicheLower)
      );
      return nicheMatch ? [nicheMatch] : [availableVideos[0]];
    }
    return [availableVideos[0]];
  }, [availableVideos, selectedNotionVideoIds, brand]);

  // Primary video for YouTube historical views match query
  const primaryVideo = selectedVideos[0] || null;

  // ── YouTube match query for social proof ─────────────────────────────
  const { data: youtubeMatchData, isLoading: isMatchingYoutube } = useQuery({
    queryKey: ["/api/integrations/youtube/match-by-title", primaryVideo?.title],
    queryFn: async () => {
      if (!primaryVideo?.title) return null;
      const res = await fetch(`/api/integrations/youtube/match-by-title?title=${encodeURIComponent(primaryVideo.title)}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: open && !!primaryVideo?.title,
  });

  const activeYoutubeMatch = useMemo(() => {
    if (selectedYoutubeId === "none") return null;
    const matchesList = youtubeMatchData?.matches || [];
    if (selectedYoutubeId && selectedYoutubeId !== "auto") {
      return matchesList.find((m: any) => m.youtubeId === selectedYoutubeId) || null;
    }
    return youtubeMatchData?.matchedVideo || matchesList[0] || null;
  }, [selectedYoutubeId, youtubeMatchData]);

  // ── YouTube videos query for social proof integration ──────────────────
  const { data: youtubeVideos = [] } = useQuery<any[]>({
    queryKey: ["/api/integrations/youtube/videos"],
    queryFn: async () => {
      const res = await fetch("/api/integrations/youtube/videos", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  // Helper to resolve YouTube URL and view metrics for a video title (NEVER NOTION)
  const getYoutubeProofForVideo = (videoTitle: string) => {
    if (!videoTitle) return { url: null, views: "alto alcance de" };
    const titleLower = videoTitle.toLowerCase();

    // 1. Try exact or partial match in YouTube db videos
    const match = youtubeVideos.find((yt: any) =>
      yt.title.toLowerCase().includes(titleLower) || titleLower.includes(yt.title.toLowerCase())
    );
    if (match) {
      const url = match.url || (match.youtubeId ? `https://www.youtube.com/watch?v=${match.youtubeId}` : null);
      const views = match.viewCount 
        ? (match.viewCount >= 1_000_000 ? `${(match.viewCount / 1_000_000).toFixed(1)}M` : `${Math.round(match.viewCount / 1000)}K`)
        : "alto alcance de";
      return { url, views };
    }

    // 2. Try activeYoutubeMatch
    if (activeYoutubeMatch) {
      const url = activeYoutubeMatch.url || (activeYoutubeMatch.youtubeId ? `https://www.youtube.com/watch?v=${activeYoutubeMatch.youtubeId}` : null);
      const views = activeYoutubeMatch.formattedViews || "alto alcance de";
      return { url, views };
    }

    // 3. Check if selectedVideoLink is a YouTube link
    if (selectedVideoLink && /youtube\.com|youtu\.be/i.test(selectedVideoLink)) {
      return { url: selectedVideoLink, views: "alto alcance de" };
    }

    return { url: null, views: "alto alcance de" };
  };

  // ── Mutations ─────────────────────────────────────────────────────────
  const sendEmailMutation = useMutation({
    mutationFn: sendEmailToBrand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "✅ Email Enviado", description: `Email enviado correctamente a ${brand?.marca}` });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Error al enviar el email", variant: "destructive" });
    },
  });

  // ── Toggle video selection ────────────────────────────────────────────
  const toggleVideoSelection = (videoId: string) => {
    setEmailGenerated(false);
    setSelectedNotionVideoIds(prev => {
      if (prev.includes(videoId)) {
        return prev.filter(id => id !== videoId);
      } else {
        return [...prev, videoId];
      }
    });
  };

  const selectAllVideos = () => {
    setEmailGenerated(false);
    setSelectedNotionVideoIds(availableVideos.map(v => v.notionPageId || v.id || ""));
  };

  const clearVideoSelection = () => {
    setEmailGenerated(false);
    setSelectedNotionVideoIds([]);
  };

  // ── Helper functions ──────────────────────────────────────────────────
  const textToHtml = (text: string) => {
    if (!text) return "";
    return text
      .split('\n\n')
      .map(p => {
        const clean = p.trim().replace(/\n/g, '<br/>');
        return `<p>${clean}</p>`;
      })
      .join('');
  };

  const formatVideoDate = (date: string | Date | null) => {
    if (!date) return "Próximamente";
    return formatDate(date);
  };

  const daysUntilPublish = (date: string | Date | null) => {
    if (!date) return null;
    const d = new Date(date);
    const now = new Date();
    return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  // ── Simplified Email Template Generator ───────────────────────────────
  const generateSimplifiedEmail = () => {
    if (!brand) return "";

    const contactName = brand.contacto || `${brand.marca}`;
    const brandName = brand.marca;
    const campaign = brand.campania && brand.campania.toLowerCase() !== "general" ? brand.campania : null;
    const formattedViews = activeYoutubeMatch?.formattedViews || "decenas de miles de";

    const buildVideoItems = (lang: string) => {
      if (!selectedVideos.length) {
        return lang === "en" ? '• 🎬 "High-Impact YouTube Video Integration"' :
               lang === "pt" ? '• 🎬 "Integração em Vídeo do YouTube de Alto Impacto"' :
               lang === "de" ? '• 🎬 "Hochwirksame YouTube-Video-Integration"' :
               '• 🎬 "Integración en Video de YouTube de Alto Impacto"';
      }

      return selectedVideos.map((v) => {
        const proof = getYoutubeProofForVideo(v.title);
        // Only use YouTube URLs, NEVER Notion page links
        const youtubeUrl = (proof.url && /youtube\.com|youtu\.be/i.test(proof.url)) 
          ? proof.url 
          : (selectedVideoLink && /youtube\.com|youtu\.be/i.test(selectedVideoLink) ? selectedVideoLink : null);

        const urlText = youtubeUrl ? `\n  🔗 Link: ${youtubeUrl}` : "";
        const formattedViews = proof.views;

        if (lang === "en") {
          return `• 🎬 "${v.title}"${urlText}\n  (This video achieved high reach with ${formattedViews} views; we project this upcoming video on a similar topic will achieve comparable or even higher reach).`;
        } else if (lang === "pt") {
          return `• 🎬 "${v.title}"${urlText}\n  (Este vídeo alcançou um alto alcance com ${formattedViews} visualizações, portanto prevemos que este próximo vídeo de tema semelhante terá alcance igual ou superior).`;
        } else if (lang === "de") {
          return `• 🎬 "${v.title}"${urlText}\n  (Dieses Video erzielte eine hohe Reichweite von ${formattedViews} Aufrufen. Wir gehen davon aus, dass dieses bevorstehende Video zu einem ähnlichen Thema eine vergleichbare oder höhere Reichweite erzielen wird).`;
        } else {
          return `• 🎬 "${v.title}"${urlText}\n  (Este video tuvo un alto alcance de ${formattedViews} visualizaciones, por lo que entendemos que este que estoy ofreciéndote de temática similar tendrá igual o similar alcance con potencial a ser mayor).`;
        }
      }).join("\n\n");
    };

    if (emailLanguage === "en") {
      return `Hi ${contactName},

${campaign ? `Regarding your "${campaign}" campaign` : "Regarding our upcoming sponsorship opportunity"}, I am offering a high-impact integration in long-form YouTube content.

${selectedVideos.length > 1 ? "The videos currently available for sponsorship are:" : "The video currently available for sponsorship is:"}

${buildVideoItems("en")}

${selectedVideoLink && /youtube\.com|youtu\.be/i.test(selectedVideoLink) ? `Here is an example from a previous integration:\n🔗 ${selectedVideoLink}\n\n` : ""}Would you be open to a quick call or email exchange to coordinate details?

Best regards,
Carlos Saca
Saca Tech | @saca.technology`;
    }

    if (emailLanguage === "pt") {
      return `Olá ${contactName},

${campaign ? `Em relação à sua campanha "${campaign}"` : "Em relação à nossa próxima oportunidade de patrocínio"}, estou oferecendo uma integração em vídeo longo no YouTube de alto impacto.

${selectedVideos.length > 1 ? "Os vídeos disponíveis para patrocínio são:" : "O vídeo disponível para patrocínio é:"}

${buildVideoItems("pt")}

${selectedVideoLink && /youtube\.com|youtu\.be/i.test(selectedVideoLink) ? `Você pode ver um exemplo de integração anterior aqui:\n🔗 ${selectedVideoLink}\n\n` : ""}Você estaria disponível para uma rápida ligação ou troca de e-mails para alinhar os detalhes?

Atenciosamente,
Carlos Saca
Saca Tech | @saca.technology`;
    }

    if (emailLanguage === "de") {
      return `Hallo ${contactName},

${campaign ? `Bezüglich Ihrer Kampagne "${campaign}"` : "Bezüglich unserer bevorstehenden Sponsoring-Möglichkeit"}, biete ich eine hochwirksame Integration in Long-Form-YouTube-Inhalten an.

${selectedVideos.length > 1 ? "Die derzeit für ein Sponsoring verfügbaren Videos sind:" : "Das derzeit für ein Sponsoring verfügbare Video ist:"}

${buildVideoItems("de")}

${selectedVideoLink && /youtube\.com|youtu\.be/i.test(selectedVideoLink) ? `Hier ist ein Beispiel einer früheren Integration:\n🔗 ${selectedVideoLink}\n\n` : ""}Wären Sie für ein kurzes Telefonat oder einen E-Mail-Austausch offen, um die Details abzustimmen?

Mit freundlichen Grüßen,
Carlos Saca
Saca Tech | @saca.technology`;
    }

    // Default Spanish
    return `Hola ${contactName},

${campaign ? `Respecto a la campaña "${campaign}"` : "Respecto a la campaña"}, estoy ofreciendo una integración en un video de YouTube largo de alto impacto.

${selectedVideos.length > 1 ? "Los videos que están disponibles son:" : "El video que está disponible es:"}

${buildVideoItems("es")}

${selectedVideoLink && /youtube\.com|youtu\.be/i.test(selectedVideoLink) ? `Puedes ver un ejemplo de una integración anterior aquí:\n🔗 ${selectedVideoLink}\n\n` : ""}Quedo a la espera de saber si estarías disponible para una breve llamada o responder por este medio para coordinar detalles.

Saludos cordiales,
Carlos Saca
Saca Tech | @saca.technology`;
  };

  // ── AI: Generate full email with brand + multi-video context ──────────
  const generateAIEmail = async () => {
    if (!brand) return;
    setIsGeneratingFullEmail(true);
    try {
      const videoList = selectedVideos.map(v => {
        const proof = getYoutubeProofForVideo(v.title);
        const youtubeUrl = (proof.url && /youtube\.com|youtu\.be/i.test(proof.url)) 
          ? proof.url 
          : (selectedVideoLink && /youtube\.com|youtu\.be/i.test(selectedVideoLink) ? selectedVideoLink : null);
        return {
          title: v.title,
          views: proof.views || null,
          url: youtubeUrl || null,
        };
      });

      const response = await apiRequest("POST", "/api/ai/generate-smart-email", {
        brandName: brand.marca,
        brandNiche: brand.nicho,
        contactName: brand.contacto || null,
        campaign: brand.campania || null,
        templateType,
        language: emailLanguage,
        videos: videoList,
        referenceVideoLink: (selectedVideoLink && /youtube\.com|youtu\.be/i.test(selectedVideoLink)) ? selectedVideoLink : null,
      });

      const data = await response.json();
      if (data.body) {
        const cleanBody = data.body
          .replace(/https?:\/\/app\.notion\.com\/[^\s\n]+/gi, '')
          .replace(/^[0-9a-f]{32}\s*$/gim, '')
          .trim();
        setEditedEmailBody(cleanBody);
        setEmailGenerated(true);
      }
      if (data.subject) {
        setCustomSubject(data.subject);
      }
      toast({ title: "✨ Email Generado con IA", description: "Email personalizado con prueba social de YouTube." });
    } catch (error) {
      toast({ title: "Error", description: "Error al generar con IA. Usando modelo simplificado.", variant: "destructive" });
      setEditedEmailBody(generateSimplifiedEmail());
    } finally {
      setIsGeneratingFullEmail(false);
    }
  };

  // ── AI: Refine / Rewrite email body with custom instructions ──────────
  const handleRefineEmailWithAI = async () => {
    if (!aiInstruction.trim() || !editedEmailBody) return;
    setIsRefiningEmail(true);
    try {
      const cleanedInputBody = editedEmailBody
        .replace(/https?:\/\/app\.notion\.com\/[^\s\n]+/gi, '')
        .replace(/^[0-9a-f]{32}\s*$/gim, '')
        .trim();

      const response = await apiRequest("POST", "/api/ai/refine-email", {
        currentBody: cleanedInputBody,
        instruction: aiInstruction,
        brandName: brand?.marca,
        language: emailLanguage,
      });
      const data = await response.json();
      if (data.refinedBody) {
        const cleanedOutput = data.refinedBody
          .replace(/https?:\/\/app\.notion\.com\/[^\s\n]+/gi, '')
          .replace(/^[0-9a-f]{32}\s*$/gim, '')
          .trim();
        setEditedEmailBody(cleanedOutput);
        setEmailGenerated(true);
        setAiInstruction("");
        toast({ title: "✨ Redacción Actualizada", description: "Gemini ha modificado la redacción según tus indicaciones." });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Error al refinar email con Gemini", variant: "destructive" });
    } finally {
      setIsRefiningEmail(false);
    }
  };

  // ── Save current email as niche default model template ────────────────
  const handleSaveAsNicheTemplate = async () => {
    if (!brand?.nicho || !editedEmailBody) return;
    setIsSavingTemplate(true);
    try {
      const response = await apiRequest("POST", "/api/content-templates/save-for-niche", {
        nicho: brand.nicho,
        contenido: editedEmailBody,
        videoLinks: selectedVideoLink ? [selectedVideoLink] : [],
      });
      const data = await response.json();
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/content-templates"] });
        toast({
          title: "⭐ Plantilla Modelo Guardada",
          description: `Esta redacción ha sido guardada como plantilla modelo para el nicho "${brand.nicho}".`,
        });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Error al guardar plantilla modelo", variant: "destructive" });
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // ── Subject suggestions ───────────────────────────────────────────────
  const generateSubjectSuggestions = async () => {
    if (!brand) return;
    setIsGeneratingSuggestions(true);
    try {
      const videoTitle = selectedVideos[0]?.title || null;
      const response = await apiRequest("POST", "/api/ai/generate-subjects", {
        brandName: brand.marca,
        purpose: templateType === "followup" ? "follow-up email" : "brand collaboration outreach",
        count: 3,
        videoTitle,
      });
      const data = await response.json();
      setAiSuggestions(data.subjects || []);
    } catch {
      toast({ title: "Error", description: "Error al generar sugerencias de asunto", variant: "destructive" });
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  // ── Copy to clipboard ─────────────────────────────────────────────────
  const copyEmailToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(editedEmailBody);
      setCopiedToClipboard(true);
      toast({ title: "📋 Copiado", description: "Email copiado al portapapeles" });
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch {
      toast({ title: "Error", description: "No se pudo copiar", variant: "destructive" });
    }
  };

  // ── Send email ────────────────────────────────────────────────────────
  const handleSendEmail = () => {
    if (!brand) return;
    sendEmailMutation.mutate({
      brandId: brand.id,
      templateType,
      htmlOverride: textToHtml(editedEmailBody),
      subjectOverride: subject,
      to: recipientEmail,
    });
  };

  // ── Effects ───────────────────────────────────────────────────────────
  useEffect(() => {
    setCustomSubject("");
    setAiSuggestions([]);
    setSelectedVideoLink("");
    setEmailGenerated(false);
    setActiveStep(1);
    setAiInstruction("");
    if (brand) {
      setRecipientEmail(brand.correo || "");
    }
  }, [brand, templateType]);

  // Load custom niche template if available, else standard simplified model
  useEffect(() => {
    if (brand && contentTemplates.length > 0 && !emailGenerated) {
      const ct = contentTemplates.find((t: any) => t.nicho.toLowerCase() === brand.nicho.toLowerCase());
      if (ct?.contenido && ct.contenido.length > 30) {
        setEditedEmailBody(ct.contenido);
        if (ct.videoLinks?.[0]) setSelectedVideoLink(ct.videoLinks[0]);
        return;
      }
    }
    if (brand && !emailGenerated) {
      setEditedEmailBody(generateSimplifiedEmail());
    }
  }, [brand, templateType, selectedNotionVideoIds, selectedVideoLink, emailLanguage, activeYoutubeMatch]);

  // ── Derived Subject ───────────────────────────────────────────────────
  if (!brand) return null;

  const defaultSubject = templateType === "followup"
    ? `Seguimiento: Propuesta de Colaboración — ${brand.marca}`
    : `Propuesta de Integración en YouTube — ${brand.marca}`;

  const subject = customSubject || defaultSubject;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden">

        {/* ═══ Header ═══ */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border bg-gradient-to-r from-card to-indigo-500/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Mail className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl font-bold flex items-center gap-2 flex-wrap">
                  Redactar Propuesta para
                  <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-sm font-semibold px-2.5">
                    {brand.marca}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="mt-0.5">
                  Email simplificado de alto impacto con selección de prueba social
                </DialogDescription>
              </div>
            </div>

            {/* Language Selector */}
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-indigo-500" />
              <Select value={emailLanguage} onValueChange={(val) => { setEmailLanguage(val); setEmailGenerated(false); }}>
                <SelectTrigger className="w-[120px] h-8 text-xs font-semibold">
                  <SelectValue placeholder="Idioma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">🇪🇸 Español</SelectItem>
                  <SelectItem value="en">🇺🇸 English</SelectItem>
                  <SelectItem value="pt">🇵🇹 Português</SelectItem>
                  <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Wizard Steps ── */}
          <div className="flex items-center gap-2 mt-4">
            {[
              { num: 1, label: "1. Vídeos & Prueba Social", icon: Video },
              { num: 2, label: "2. Redacción & Gemini IA", icon: Wand2 },
              { num: 3, label: "3. Revisar y Enviar", icon: Send },
            ].map(({ num, label, icon: Icon }) => (
              <button
                key={num}
                type="button"
                onClick={() => setActiveStep(num as 1 | 2 | 3)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all flex-1 justify-center ${
                  activeStep === num
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                    : activeStep > num
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                {activeStep > num ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                <span>{label}</span>
              </button>
            ))}
          </div>
        </DialogHeader>

        {/* ═══ Content ═══ */}
        <div className="flex-1 overflow-y-auto">

          {/* ═══ STEP 1: Multi-Video & Social Proof Selection ═══ */}
          {activeStep === 1 && (
            <div className="p-6 space-y-5">
              {/* Email Type */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <Label className="text-sm font-semibold whitespace-nowrap">Tipo de Email:</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTemplateType("general")}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                        templateType === "general"
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      📩 Propuesta Modelo
                    </button>
                    <button
                      type="button"
                      onClick={() => setTemplateType("followup")}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                        templateType === "followup"
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      🔄 Seguimiento
                    </button>
                  </div>
                </div>

                <Badge variant="outline" className="text-xs px-2.5 py-1 border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
                  {selectedVideos.length} vídeo(s) seleccionado(s) como prueba social
                </Badge>
              </div>

              {/* YouTube Social Proof Match (Reach Proof) */}
              {primaryVideo && (
                <div className="p-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-emerald-500/10 border border-amber-500/30 rounded-xl space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      🔥 Prueba Social de Visualizaciones (YouTube)
                    </span>
                    {activeYoutubeMatch && (
                      <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] px-2.5 py-0.5 shadow-sm">
                        {activeYoutubeMatch.formattedViews} views logradas
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Se citarán estas visualizaciones históricas para justificar el alcance proyectado del nuevo vídeo ofertado.
                  </p>

                  {youtubeMatchData?.matches?.length ? (
                    <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                      {youtubeMatchData.matches.map((vMatch: any) => {
                        const isSelected = activeYoutubeMatch?.youtubeId === vMatch.youtubeId;
                        return (
                          <button
                            key={vMatch.youtubeId}
                            type="button"
                            onClick={() => { setSelectedYoutubeId(vMatch.youtubeId); setEmailGenerated(false); }}
                            className={`text-left p-2 rounded-lg border text-xs transition-all flex items-center justify-between gap-2 ${
                              isSelected
                                ? "bg-amber-500/15 border-amber-500/50 text-foreground font-semibold shadow-sm ring-1 ring-amber-500/30"
                                : "bg-card/70 border-border/70 hover:bg-amber-500/5 hover:border-amber-500/30 text-muted-foreground"
                            }`}
                          >
                            <span className="truncate flex-1">
                              {isSelected ? "✓ " : "• "}"{vMatch.title}"
                            </span>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 flex-shrink-0 ${
                              isSelected ? "border-amber-500 text-amber-600 font-bold" : "border-border text-muted-foreground"
                            }`}>
                              {vMatch.formattedViews} views
                            </Badge>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              )}

              {/* Multi-Video Selection Grid */}
              {availableVideos.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">
                      Selecciona uno o varios vídeos para incluir en la propuesta:
                    </Label>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="ghost" onClick={selectAllVideos} className="text-[11px] h-7 px-2">
                        <CheckSquare className="h-3.5 w-3.5 mr-1" /> Seleccionar todos
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={clearVideoSelection} className="text-[11px] h-7 px-2">
                        <Square className="h-3.5 w-3.5 mr-1" /> Limpiar
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[280px] overflow-y-auto pr-1">
                    {availableVideos.map((video) => {
                      const vId = video.notionPageId || video.id || "";
                      const isSelected = selectedVideos.some(v => (v.notionPageId || v.id) === vId);
                      const days = daysUntilPublish(video.targetDate);
                      return (
                        <button
                          key={vId}
                          type="button"
                          onClick={() => toggleVideoSelection(vId)}
                          className={`text-left p-3.5 rounded-xl border-2 transition-all duration-200 group relative ${
                            isSelected
                              ? "border-indigo-500 bg-indigo-500/5 shadow-md ring-1 ring-indigo-500/20"
                              : "border-border hover:border-indigo-500/40 hover:bg-indigo-500/5"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                              isSelected
                                ? "bg-indigo-600 text-white shadow-md"
                                : "bg-muted text-muted-foreground group-hover:bg-indigo-500/20"
                            }`}>
                              {isSelected ? <Check className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className={`font-semibold text-xs leading-snug line-clamp-2 ${
                                isSelected ? "text-indigo-700 dark:text-indigo-300" : "text-foreground"
                              }`}>
                                {video.title}
                              </h5>
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                                <span className="flex items-center gap-0.5">
                                  <Calendar className="h-3 w-3 text-indigo-500" />
                                  {formatVideoDate(video.targetDate)}
                                </span>
                                {days !== null && days <= 14 && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-400 text-amber-600">
                                    ⏱ {days}d
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
                  <Video className="h-8 w-8 mx-auto mb-1 opacity-30" />
                  <p className="font-semibold text-sm">No hay vídeos en estado de guión/disponibles</p>
                </div>
              )}

              {/* Reference video link */}
              <div className="bg-emerald-50/50 dark:bg-emerald-950/10 p-4 rounded-xl border border-emerald-200/50 space-y-2">
                <Label className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  🔗 Ejemplo de Integración Anterior (Vídeo de Referencia)
                </Label>
                <Input
                  value={selectedVideoLink}
                  onChange={(e) => { setSelectedVideoLink(e.target.value); setEmailGenerated(false); }}
                  placeholder="https://youtube.com/watch?v=..."
                  className="text-xs"
                />
              </div>

              {/* Next button */}
              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => setActiveStep(2)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 px-6 shadow-md shadow-indigo-500/20"
                >
                  Continuar a Redacción <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ═══ STEP 2: Email Composition & Gemini AI Refinement ═══ */}
          {activeStep === 2 && (
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Left Controls */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block text-muted-foreground">📧 Destinatario</Label>
                    <Input
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="email@marca.com"
                      className="text-xs"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs font-semibold text-muted-foreground">📋 Asunto</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={generateSubjectSuggestions}
                        disabled={isGeneratingSuggestions}
                        className="text-[11px] text-indigo-600 h-6 px-2"
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        Sugerir Asunto
                      </Button>
                    </div>
                    <Input
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      placeholder={defaultSubject}
                      className="text-xs"
                    />
                  </div>

                  {/* ── GEMINI AI REFINEMENT BOX ── */}
                  <div className="bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 border border-purple-500/25 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                        <Bot className="h-4 w-4 text-purple-600" />
                        Pedir Cambio de Redacción a Gemini IA
                      </Label>
                      <Badge className="bg-purple-600 text-white text-[10px]">IA Activa</Badge>
                    </div>

                    <Textarea
                      value={aiInstruction}
                      onChange={(e) => setAiInstruction(e.target.value)}
                      placeholder="Escribe los cambios que deseas (ej: 'Hazlo más persuasivo', 'Enfócate en la exclusividad', 'Tradúcelo a inglés', 'Hazlo más corto')..."
                      className="text-xs min-h-[75px] bg-card/80 border-purple-500/20"
                    />

                    <div className="flex items-center justify-between gap-2">
                      <Button
                        type="button"
                        onClick={handleRefineEmailWithAI}
                        disabled={isRefiningEmail || !aiInstruction.trim()}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5 h-9 font-semibold flex-1 shadow-sm"
                      >
                        {isRefiningEmail ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                        {isRefiningEmail ? "Refinando..." : "Refinar con Gemini IA"}
                      </Button>

                      <Button
                        type="button"
                        onClick={generateAIEmail}
                        disabled={isGeneratingFullEmail}
                        variant="outline"
                        className="text-xs h-9 gap-1"
                      >
                        {isGeneratingFullEmail ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-indigo-500" />}
                        Regenerar Todo
                      </Button>
                    </div>
                  </div>

                  {/* SAVE AS NICHE MODEL TEMPLATE BUTTON */}
                  <Button
                    type="button"
                    onClick={handleSaveAsNicheTemplate}
                    disabled={isSavingTemplate || !editedEmailBody}
                    variant="outline"
                    className="w-full border-amber-500/40 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400 gap-2 h-10 text-xs font-bold"
                  >
                    <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                    {isSavingTemplate ? "Guardando..." : `Guardar como Plantilla Modelo para "${brand.nicho}"`}
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center">
                    Esta redacción se usará por defecto para todas las futuras marcas del nicho {brand.nicho}.
                  </p>
                </div>

                {/* Right: Email Text Editor */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-muted-foreground">✏️ Redacción del Email (editable)</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditedEmailBody(generateSimplifiedEmail())}
                        className="text-[10px] h-6 px-2"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Restaurar Modelo
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={copyEmailToClipboard}
                        className="text-[10px] h-6 px-2"
                      >
                        {copiedToClipboard ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                        {copiedToClipboard ? "Copiado" : "Copiar"}
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={editedEmailBody}
                    onChange={(e) => setEditedEmailBody(e.target.value)}
                    className="min-h-[380px] font-sans text-xs p-4 bg-muted/20 focus:bg-card border rounded-xl resize-y leading-relaxed"
                  />
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setActiveStep(1)} className="text-xs gap-1">
                  ← Volver a Vídeos
                </Button>
                <Button
                  onClick={() => setActiveStep(3)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-2 px-6 shadow-md"
                >
                  Revisar Email <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ═══ STEP 3: Review & Send ═══ */}
          {activeStep === 3 && (
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-card border border-border rounded-xl p-4">
                  <p className="text-[11px] text-muted-foreground font-semibold mb-1">📧 Destinatario</p>
                  <p className="text-xs font-semibold text-foreground truncate">{recipientEmail || "Sin email"}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{brand.marca}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <p className="text-[11px] text-muted-foreground font-semibold mb-1">📋 Asunto</p>
                  <p className="text-xs font-semibold text-foreground line-clamp-2">{subject}</p>
                </div>
                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4">
                  <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mb-1">🎬 Vídeos Ofertados</p>
                  <p className="text-xs font-semibold text-foreground">{selectedVideos.length} vídeo(s)</p>
                </div>
              </div>

              {/* Preview */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-2 block flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  Vista Previa del Email
                </Label>
                <div className="bg-white dark:bg-gray-900 border border-border rounded-xl p-6 shadow-inner max-h-[320px] overflow-y-auto">
                  <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed whitespace-pre-wrap font-sans text-foreground">
                    {editedEmailBody || "Sin contenido"}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <Button variant="ghost" onClick={() => setActiveStep(2)} className="text-xs gap-1">
                  ← Editar Email
                </Button>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSaveAsNicheTemplate}
                    disabled={isSavingTemplate}
                    className="text-xs gap-1 border-amber-500/30 text-amber-700 dark:text-amber-400"
                  >
                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                    Guardar Modelo
                  </Button>
                  <Button
                    onClick={handleSendEmail}
                    disabled={sendEmailMutation.isPending || !recipientEmail}
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/20 gap-2 px-6 h-10 font-semibold text-xs"
                  >
                    {sendEmailMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Enviar Email
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
