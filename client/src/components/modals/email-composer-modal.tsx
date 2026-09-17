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
  ExternalLink, Eye, ArrowRight, Wand2, Check, Copy, Mail
} from "lucide-react";
import type { Brand } from "@shared/schema";

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
  const [customSubject, setCustomSubject] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [editedEmailBody, setEditedEmailBody] = useState("");

  // ── Video state ───────────────────────────────────────────────────────
  const [selectedNotionVideoId, setSelectedNotionVideoId] = useState<string>("auto");
  const [selectedYoutubeId, setSelectedYoutubeId] = useState<string>("auto");
  const [selectedVideoLink, setSelectedVideoLink] = useState("");

  // ── AI state ──────────────────────────────────────────────────────────
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [isGeneratingFullEmail, setIsGeneratingFullEmail] = useState(false);
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

  // ── Derived: selected video ───────────────────────────────────────────
  const selectedVideo = useMemo(() => {
    if (!notionVideos.length) return null;
    if (selectedNotionVideoId && selectedNotionVideoId !== "auto") {
      return notionVideos.find(v => v.notionPageId === selectedNotionVideoId || v.id === selectedNotionVideoId) || null;
    }
    // Auto-select: match brand niche, or first available
    if (brand) {
      const brandNicheLower = (brand.nicho || "").toLowerCase();
      const nicheMatch = notionVideos.find(v =>
        (v.nicho && v.nicho.toLowerCase().includes(brandNicheLower)) ||
        v.title.toLowerCase().includes(brandNicheLower)
      );
      return nicheMatch || notionVideos[0] || null;
    }
    return notionVideos[0] || null;
  }, [notionVideos, selectedNotionVideoId, brand]);

  // ── YouTube match query for selected video (Social Proof) ──────────────
  const { data: youtubeMatchData, isLoading: isMatchingYoutube } = useQuery({
    queryKey: ["/api/integrations/youtube/match-by-title", selectedVideo?.title],
    queryFn: async () => {
      if (!selectedVideo?.title) return null;
      const res = await fetch(`/api/integrations/youtube/match-by-title?title=${encodeURIComponent(selectedVideo.title)}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: open && !!selectedVideo?.title,
  });

  const activeYoutubeMatch = useMemo(() => {
    if (selectedYoutubeId === "none") return null;
    const matchesList = youtubeMatchData?.matches || [];
    if (selectedYoutubeId && selectedYoutubeId !== "auto") {
      return matchesList.find((m: any) => m.youtubeId === selectedYoutubeId) || null;
    }
    return youtubeMatchData?.matchedVideo || matchesList[0] || null;
  }, [selectedYoutubeId, youtubeMatchData]);

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

  // ── Helper functions ──────────────────────────────────────────────────
  const htmlToText = (html: string) => {
    if (!html) return "";
    return html
      .replace(/<p>/g, "")
      .replace(/<\/p>/g, "\n\n")
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/<strong>/g, "")
      .replace(/<\/strong>/g, "")
      .replace(/<a[^>]* href="([^"]*)"[^>]*>.*?<\/a>/g, "$1")
      .replace(/<[^>]*>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };

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
    if (!date) return "Coming soon";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  const formatVideoDateShort = (date: string | Date | null) => {
    if (!date) return "TBD";
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const daysUntilPublish = (date: string | Date | null) => {
    if (!date) return null;
    const d = new Date(date);
    const now = new Date();
    const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // ── Generate professional email ───────────────────────────────────────
  const generateProfessionalEmail = () => {
    if (!brand) return "";

    const contactName = brand.contacto || `${brand.marca} team`;
    const brandName = brand.marca;
    const brandNiche = brand.nicho || "tech";
    const campaign = brand.campania;

    // Selected Notion video context
    let videoProposalBlock = "";
    if (selectedVideo) {
      let socialProof = "";
      if (activeYoutubeMatch) {
        socialProof = `

📊 HISTORICAL PERFORMANCE & EXPECTED VIEWS:
Based on our channel history, our previous video on a similar topic ("${activeYoutubeMatch.title}") reached ${activeYoutubeMatch.formattedViews} views (${activeYoutubeMatch.url}), giving us strong confidence in high view performance for this video.`;
      }

      videoProposalBlock = `

📹 PROPOSED VIDEO FOR INTEGRATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Title: "${selectedVideo.title}"${socialProof}

We are offering a dedicated 60–90 second integration in this upcoming high-reach video on our channel, presented naturally and organically, showcasing your product/service in a real-world context. This video is a perfect fit for ${brandName} as it's directly aligned with your brand and target audience.`;
    }

    // Reference video link
    let referenceBlock = "";
    if (selectedVideoLink && selectedVideoLink !== "none") {
      referenceBlock = `

To give you a sense of the quality and format of our integrations, here's an example from a previous collaboration:
🔗 ${selectedVideoLink}`;
    }

    // Campaign mention
    const campaignLine = campaign && campaign.toLowerCase() !== "general"
      ? `\nRegarding your "${campaign}" campaign, we believe there's a perfect synergy for this collaboration.\n`
      : "";

    if (templateType === "followup") {
      const videoRef = selectedVideo ? ` regarding the upcoming high-reach video "${selectedVideo.title}"` : "";
      const proofRef = activeYoutubeMatch ? ` (our previous video in this category hit ${activeYoutubeMatch.formattedViews} views)` : "";
      return `Hi ${contactName},

This is Carlos Saca from Saca Tech (@saca.technology).

I wanted to follow up on my previous message about the collaboration opportunity${videoRef} with ${brandName}.

We remain very interested in featuring your product/service in our content and believe our audience is a great fit for the ${brandNiche} space.
${selectedVideo ? `\nThe video "${selectedVideo.title}" is available for integration${proofRef}. We are offering a dedicated 60–90s integration slot in this upcoming high-reach video.` : ""}

Would you have availability for a quick call or email exchange this week to discuss the details?

Looking forward to hearing from you.

Best regards,
Carlos Saca
Saca Tech | @saca.technology`;
    }

    return `Hi ${contactName},

I'm Carlos Saca, tech content creator at Saca Tech (@saca.technology). We produce high-quality content about ${brandNiche} across YouTube, Instagram, and TikTok, reaching a highly engaged audience passionate about technology and innovation.
${campaignLine}
I'm reaching out because I see a great collaboration opportunity between ${brandName} and our channel. Our content is closely aligned with the ${brandNiche} space and we have a very active, engaged community.${videoProposalBlock}

This approach drives significantly more credibility and engagement than traditional advertising.${referenceBlock}

Would you be open to a quick call or email exchange?

Looking forward to hearing from you.

Best regards,
Carlos Saca
Saca Tech | @saca.technology`;
  };

  // ── AI: Generate full email with brand + video context ────────────────
  const generateAIEmail = async () => {
    if (!brand) return;
    setIsGeneratingFullEmail(true);
    try {
      const videoContext = selectedVideo ? {
        title: selectedVideo.title,
        targetDate: selectedVideo.targetDate,
        status: selectedVideo.status,
        nicho: selectedVideo.nicho,
      } : null;

      const response = await apiRequest("POST", "/api/ai/generate-smart-email", {
        brandName: brand.marca,
        brandNiche: brand.nicho,
        contactName: brand.contacto || null,
        campaign: brand.campania || null,
        templateType,
        videoContext,
        matchedYoutubeVideo: activeYoutubeMatch,
        referenceVideoLink: selectedVideoLink || null,
      });

      const data = await response.json();
      if (data.body) {
        setEditedEmailBody(data.body);
        setEmailGenerated(true);
      }
      if (data.subject) {
        setCustomSubject(data.subject);
      }
      toast({ title: "✨ Email Generado", description: "Email personalizado con prueba social de views generado por IA" });
    } catch (error) {
      toast({ title: "Error", description: "Error al generar el email con IA. Usando plantilla estándar.", variant: "destructive" });
      setEditedEmailBody(generateProfessionalEmail());
    } finally {
      setIsGeneratingFullEmail(false);
    }
  };

  // ── AI: Subject suggestions ───────────────────────────────────────────
  const generateSubjectSuggestions = async () => {
    if (!brand) return;
    setIsGeneratingSuggestions(true);
    try {
      const videoTitle = selectedVideo?.title || null;
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

  // ── Effects: session storage, resets, pre-fill ────────────────────────
  useEffect(() => {
    if (open) {
      const stored = sessionStorage.getItem("selectedNotionVideo");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed?.notionPageId) {
            setSelectedNotionVideoId(parsed.notionPageId);
          }
        } catch {}
        sessionStorage.removeItem("selectedNotionVideo");
      }
    }
  }, [open]);

  useEffect(() => {
    setCustomSubject("");
    setAiSuggestions([]);
    setSelectedVideoLink("");
    setEmailGenerated(false);
    setActiveStep(1);
    if (brand) {
      setRecipientEmail(brand.correo || "");
    }
  }, [brand, templateType]);

  useEffect(() => {
    if (brand && contentTemplates.length > 0) {
      const ct = contentTemplates.find((t: any) => t.nicho.toLowerCase() === brand.nicho.toLowerCase());
      if (ct?.videoLinks?.[0]) {
        setSelectedVideoLink(ct.videoLinks[0]);
      }
    }
  }, [brand?.nicho, contentTemplates.length]);

  // Auto-generate email body when video or brand changes (but only if not AI-generated)
  useEffect(() => {
    if (brand && !emailGenerated) {
      setEditedEmailBody(generateProfessionalEmail());
    }
  }, [brand, templateType, selectedNotionVideoId, selectedVideoLink, notionVideos, activeYoutubeMatch]);

  // ── Derived ───────────────────────────────────────────────────────────
  if (!brand) return null;

  const defaultSubject = templateType === "followup"
    ? `Follow-up: Collaboration — ${brand.marca}${selectedVideo ? ` | ${selectedVideo.title}` : ""}`
    : `Collaboration Opportunity — ${brand.marca}${selectedVideo ? ` | ${selectedVideo.title}` : ""}`;

  const subject = customSubject || defaultSubject;

  // Available (non-sold) videos for selection
  const availableVideos = notionVideos.filter(v =>
    !v.isSold && v.sponsorshipAvailable && !(v.status && /vendido|patrocinado|sold|sponsored/i.test(v.status))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden">

        {/* ═══ Header ═══ */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border bg-gradient-to-r from-card to-indigo-500/5">
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
                Email de patrocinio personalizado con datos del vídeo y la marca
              </DialogDescription>
            </div>
          </div>

          {/* ── Wizard Steps ── */}
          <div className="flex items-center gap-2 mt-4">
            {[
              { num: 1, label: "Seleccionar Vídeo", icon: Video },
              { num: 2, label: "Redactar Email", icon: Wand2 },
              { num: 3, label: "Revisar y Enviar", icon: Send },
            ].map(({ num, label, icon: Icon }, idx) => (
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
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{num}</span>
              </button>
            ))}
          </div>
        </DialogHeader>

        {/* ═══ Content ═══ */}
        <div className="flex-1 overflow-y-auto">

          {/* ═══ STEP 1: Video Selection ═══ */}
          {activeStep === 1 && (
            <div className="p-6 space-y-5">
              {/* Template type */}
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
                    📩 Primera Propuesta
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

              {/* Selected video preview card */}
              {selectedVideo && (
                <div className="bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 border border-indigo-500/20 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                      🎬 Vídeo Seleccionado para la Propuesta
                    </Label>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px]">
                      Activo
                    </Badge>
                  </div>
                  <div className="bg-card/80 backdrop-blur border border-border rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-500/20">
                        <Video className="h-7 w-7 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-foreground text-base leading-snug">{selectedVideo.title}</h4>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                            {formatVideoDate(selectedVideo.targetDate)}
                          </span>
                          {daysUntilPublish(selectedVideo.targetDate) !== null && (
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                              daysUntilPublish(selectedVideo.targetDate)! <= 7
                                ? "border-red-500/50 text-red-600 bg-red-50 dark:bg-red-950/20"
                                : daysUntilPublish(selectedVideo.targetDate)! <= 14
                                ? "border-amber-500/50 text-amber-600 bg-amber-50 dark:bg-amber-950/20"
                                : "border-emerald-500/50 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20"
                            }`}>
                              {daysUntilPublish(selectedVideo.targetDate)! <= 0
                                ? "📢 ¡Publicación inminente!"
                                : `⏱ En ${daysUntilPublish(selectedVideo.targetDate)} días`}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            📝 {selectedVideo.status || "Escritura"}
                          </Badge>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-[10px]">
                            📎 Se incluirá en el email
                          </Badge>
                          {selectedVideo.notionUrl && (
                            <a
                              href={selectedVideo.notionUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-muted-foreground hover:text-indigo-500 flex items-center gap-0.5 transition-colors"
                            >
                              <ExternalLink className="h-3 w-3" /> Notion
                            </a>
                          )}
                        </div>

                        {/* YouTube Social Proof Match Selector */}
                        {isMatchingYoutube ? (
                          <div className="mt-3 p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground flex items-center gap-2 animate-pulse">
                            <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                            Buscando matches históricos en YouTube para justificar visualizaciones...
                          </div>
                        ) : (youtubeMatchData?.matches?.length ?? 0) > 0 ? (
                          <div className="mt-3 p-3.5 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-emerald-500/10 border border-amber-500/30 rounded-xl space-y-2.5 shadow-sm">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                🔥 Selecciona el Vídeo Histórico de YouTube (Prueba Social)
                              </span>
                              {activeYoutubeMatch && (
                                <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] px-2.5 py-0.5 shadow-sm">
                                  {activeYoutubeMatch.formattedViews} views
                                </Badge>
                              )}
                            </div>

                            {/* Options list */}
                            <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                              {youtubeMatchData.matches.map((vMatch: any) => {
                                const isSelected = activeYoutubeMatch?.youtubeId === vMatch.youtubeId;
                                return (
                                  <button
                                    key={vMatch.youtubeId}
                                    type="button"
                                    onClick={() => {
                                      setSelectedYoutubeId(vMatch.youtubeId);
                                      setEmailGenerated(false);
                                    }}
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

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedYoutubeId("none");
                                  setEmailGenerated(false);
                                }}
                                className={`text-left p-2 rounded-lg border text-xs transition-all ${
                                  selectedYoutubeId === "none"
                                    ? "bg-gray-500/15 border-gray-500/50 text-foreground font-semibold"
                                    : "bg-card/70 border-border/70 hover:bg-muted text-muted-foreground"
                                }`}
                              >
                                🚫 No incluir prueba social de YouTube
                              </button>
                            </div>

                            {activeYoutubeMatch && (
                              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-amber-500/20">
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                  ✓ Se incluirá como justificación de views en el email para {brand.marca}
                                </span>
                                {activeYoutubeMatch.url && (
                                  <a
                                    href={activeYoutubeMatch.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 font-medium"
                                  >
                                    Ver vídeo <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Video grid */}
              {availableVideos.length > 0 ? (
                <div>
                  <Label className="text-sm font-semibold mb-3 block">
                    Selecciona el vídeo que quieres ofrecer a <span className="text-indigo-600 dark:text-indigo-400">{brand.marca}</span>
                    <span className="text-muted-foreground font-normal ml-2">({availableVideos.length} disponibles)</span>
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                    {availableVideos.map((video) => {
                      const isSelected = selectedVideo?.notionPageId === video.notionPageId;
                      const days = daysUntilPublish(video.targetDate);
                      return (
                        <button
                          key={video.notionPageId || video.id}
                          type="button"
                          onClick={() => {
                            setSelectedNotionVideoId(video.notionPageId || video.id || "auto");
                            setEmailGenerated(false);
                          }}
                          className={`text-left p-3.5 rounded-xl border-2 transition-all duration-200 group ${
                            isSelected
                              ? "border-indigo-500 bg-indigo-500/5 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/20"
                              : "border-border hover:border-indigo-500/40 hover:bg-indigo-500/5 hover:shadow-sm"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                              isSelected
                                ? "bg-indigo-600 text-white shadow-md"
                                : "bg-muted group-hover:bg-indigo-500/20 text-muted-foreground group-hover:text-indigo-600"
                            }`}>
                              {isSelected ? <Check className="h-5 w-5" /> : <Video className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className={`font-semibold text-sm leading-snug line-clamp-2 transition-colors ${
                                isSelected ? "text-indigo-700 dark:text-indigo-300" : "text-foreground"
                              }`}>
                                {video.title}
                              </h5>
                              <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-0.5">
                                  <Calendar className="h-3 w-3" />
                                  {formatVideoDateShort(video.targetDate)}
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
                <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
                  <Video className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="font-semibold text-foreground text-sm">No hay vídeos disponibles</p>
                  <p className="text-xs mt-1">Sincroniza tu calendario de Notion para ver los vídeos</p>
                </div>
              )}

              {/* Reference video link */}
              {(() => {
                const videoTemplate = contentTemplates.find(
                  (t: any) => t.nicho.toLowerCase() === brand.nicho.toLowerCase()
                );
                return videoTemplate && (
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/10 p-4 rounded-xl border border-emerald-200/50 dark:border-emerald-900/50 space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                      🔗 Vídeo de Referencia (ejemplo de integración anterior)
                    </Label>
                    <Input
                      value={selectedVideoLink}
                      onChange={(e) => { setSelectedVideoLink(e.target.value); setEmailGenerated(false); }}
                      placeholder="https://youtube.com/watch?v=..."
                      className="text-sm"
                    />
                    {(videoTemplate.videoLinks?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {(videoTemplate.videoLinks || []).map((link: string, idx: number) => (
                          <button
                            key={idx}
                            type="button"
                            className={`text-[10px] border px-2 py-1 rounded-lg truncate max-w-[220px] transition-colors ${
                              selectedVideoLink === link
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-card hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-border"
                            }`}
                            onClick={() => { setSelectedVideoLink(link); setEmailGenerated(false); }}
                          >
                            {link.length > 30 ? `${link.substring(0, 30)}...` : link}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

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

          {/* ═══ STEP 2: Email Composition ═══ */}
          {activeStep === 2 && (
            <div className="p-6 space-y-5">
              {/* Selected video summary bar */}
              {selectedVideo && (
                <div className="flex items-center gap-3 p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/15">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Video className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{selectedVideo.title}</p>
                    <p className="text-[11px] text-muted-foreground">{formatVideoDate(selectedVideo.targetDate)} · {selectedVideo.status}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-xs text-indigo-600"
                    onClick={() => setActiveStep(1)}
                  >
                    Cambiar
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Controls */}
                <div className="space-y-4">
                  {/* Recipient */}
                  <div>
                    <Label className="text-xs font-semibold mb-1 block text-muted-foreground">📧 Destinatario</Label>
                    <Input
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="email@marca.com"
                      className="text-sm"
                    />
                  </div>

                  {/* Subject */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs font-semibold text-muted-foreground">📋 Asunto</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={generateSubjectSuggestions}
                        disabled={isGeneratingSuggestions}
                        className="text-[11px] text-indigo-600 hover:text-indigo-700 h-7 px-2"
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        {isGeneratingSuggestions ? "Generando..." : "Sugerencias IA"}
                      </Button>
                    </div>
                    <Input
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      placeholder={defaultSubject}
                      className="text-sm"
                    />
                    {aiSuggestions.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {aiSuggestions.map((s, i) => (
                          <button
                            key={i}
                            type="button"
                            className="block w-full text-left px-3 py-2 text-xs bg-indigo-50 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 rounded-lg border border-indigo-200/50 dark:border-indigo-800/50 transition-colors"
                            onClick={() => setCustomSubject(s)}
                          >
                            💡 {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Brand context card */}
                  <div className="bg-card border border-border rounded-xl p-4 space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                      🏢 Contexto de la Marca
                    </Label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center justify-between p-2 bg-muted/40 rounded-lg">
                        <span className="text-muted-foreground">Marca</span>
                        <span className="font-semibold">{brand.marca}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-muted/40 rounded-lg">
                        <span className="text-muted-foreground">Nicho</span>
                        <Badge variant="secondary" className="text-[10px]">{brand.nicho}</Badge>
                      </div>
                      {brand.contacto && (
                        <div className="flex items-center justify-between p-2 bg-muted/40 rounded-lg">
                          <span className="text-muted-foreground">Contacto</span>
                          <span className="font-semibold">{brand.contacto}</span>
                        </div>
                      )}
                      {brand.campania && brand.campania !== "General" && (
                        <div className="flex items-center justify-between p-2 bg-muted/40 rounded-lg">
                          <span className="text-muted-foreground">Campaña</span>
                          <span className="font-semibold truncate max-w-[100px]">{brand.campania}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI Generate button */}
                  <Button
                    type="button"
                    onClick={generateAIEmail}
                    disabled={isGeneratingFullEmail}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/20 gap-2 h-11 font-semibold"
                  >
                    {isGeneratingFullEmail ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Generando email personalizado...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4" />
                        {emailGenerated ? "Regenerar Email con IA" : "✨ Generar Email con IA"}
                      </>
                    )}
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center -mt-2">
                    Genera un email profesional adaptado a {brand.marca}, su sector ({brand.nicho}) y el vídeo seleccionado
                  </p>
                </div>

                {/* Right: Email body editor */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-muted-foreground">✏️ Cuerpo del Email (editable)</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => { setEditedEmailBody(generateProfessionalEmail()); setEmailGenerated(false); }}
                        className="text-[10px] h-6 px-2 text-muted-foreground hover:text-foreground"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Restaurar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={copyEmailToClipboard}
                        className="text-[10px] h-6 px-2 text-muted-foreground hover:text-foreground"
                      >
                        {copiedToClipboard ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                        {copiedToClipboard ? "Copiado" : "Copiar"}
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={editedEmailBody}
                    onChange={(e) => setEditedEmailBody(e.target.value)}
                    className="min-h-[380px] font-sans text-sm p-4 bg-muted/20 focus:bg-card border rounded-xl resize-y leading-relaxed"
                    placeholder="Redacta tu propuesta aquí..."
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Puedes editar libremente el texto. Los saltos de línea se conservarán.
                  </p>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setActiveStep(1)} className="text-sm gap-1">
                  ← Volver al Vídeo
                </Button>
                <Button
                  onClick={() => setActiveStep(3)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 px-6 shadow-md"
                >
                  Revisar Email <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ═══ STEP 3: Review & Send ═══ */}
          {activeStep === 3 && (
            <div className="p-6 space-y-5">
              {/* Summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Recipient card */}
                <div className="bg-card border border-border rounded-xl p-4">
                  <p className="text-[11px] text-muted-foreground font-semibold mb-1">📧 Destinatario</p>
                  <p className="text-sm font-semibold text-foreground truncate">{recipientEmail || "Sin email"}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{brand.marca}</p>
                </div>
                {/* Subject card */}
                <div className="bg-card border border-border rounded-xl p-4">
                  <p className="text-[11px] text-muted-foreground font-semibold mb-1">📋 Asunto</p>
                  <p className="text-sm font-semibold text-foreground line-clamp-2">{subject}</p>
                </div>
                {/* Video card */}
                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4">
                  <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mb-1">🎬 Vídeo Ofrecido</p>
                  <p className="text-sm font-semibold text-foreground line-clamp-2">{selectedVideo?.title || "Ninguno"}</p>
                  {selectedVideo && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{formatVideoDateShort(selectedVideo.targetDate)}</p>
                  )}
                </div>
              </div>

              {/* Email preview */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-2 block flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  Vista Previa del Email
                </Label>
                <div className="bg-white dark:bg-gray-900 border border-border rounded-xl p-6 shadow-inner max-h-[350px] overflow-y-auto">
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap font-sans text-foreground">
                    {editedEmailBody || "Sin contenido"}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <Button variant="ghost" onClick={() => setActiveStep(2)} className="text-sm gap-1">
                  ← Editar Email
                </Button>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={copyEmailToClipboard}
                    className="gap-1.5"
                  >
                    {copiedToClipboard ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copiedToClipboard ? "Copiado" : "Copiar"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSendEmail}
                    disabled={sendEmailMutation.isPending || !recipientEmail}
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/20 gap-2 px-6 h-11 font-semibold"
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
