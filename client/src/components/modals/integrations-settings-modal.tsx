import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import {
  Youtube,
  FileText,
  RefreshCw,
  CheckCircle,
  XCircle,
  Settings,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
} from "lucide-react";

interface IntegrationsSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IntegrationsSettingsModal({ open, onOpenChange }: IntegrationsSettingsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [youtubeApiKey, setYoutubeApiKey] = useState("");
  const [youtubeChannelId, setYoutubeChannelId] = useState("");
  const [notionToken, setNotionToken] = useState("");
  const [notionDatabaseId, setNotionDatabaseId] = useState("");
  const [notionTitleProperty, setNotionTitleProperty] = useState("Name");
  const [notionDateProperty, setNotionDateProperty] = useState("Date");
  const [notionStatusProperty, setNotionStatusProperty] = useState("Status");
  const [notionNicheProperty, setNotionNicheProperty] = useState("Niche");
  const [showAdvancedNotion, setShowAdvancedNotion] = useState(false);

  // Load existing config
  const { data: config } = useQuery({
    queryKey: ["/api/integrations/config"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/integrations/config");
      return res.json();
    },
    enabled: open,
  });

  // Load synced YouTube videos count
  const { data: ytVideos = [] } = useQuery({
    queryKey: ["/api/integrations/youtube/videos"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/integrations/youtube/videos");
      return res.json();
    },
    enabled: open,
  });

  // Load synced Notion videos count
  const { data: notionVideos = [] } = useQuery({
    queryKey: ["/api/integrations/notion/videos"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/integrations/notion/videos");
      return res.json();
    },
    enabled: open,
  });

  useEffect(() => {
    if (config) {
      setYoutubeChannelId(config.youtubeChannelId || "");
      setNotionDatabaseId(config.notionDatabaseId || "");
      setNotionTitleProperty(config.notionTitleProperty || "Name");
      setNotionDateProperty(config.notionDateProperty || "Date");
      setNotionStatusProperty(config.notionStatusProperty || "Status");
      setNotionNicheProperty(config.notionNicheProperty || "Niche");
    }
  }, [config]);

  // Save config mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const extractDatabaseId = (raw: string) => {
        if (!raw) return "";
        const cleaned = raw.trim();
        const match = cleaned.match(/([a-f0-9]{32})/i) || cleaned.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
        if (match) return match[1].replace(/-/g, "");
        return cleaned.replace(/-/g, "");
      };

      const payload: Record<string, string> = {
        youtubeChannelId,
        notionDatabaseId: extractDatabaseId(notionDatabaseId),
        notionTitleProperty,
        notionDateProperty,
        notionStatusProperty,
        notionNicheProperty,
      };
      // Only include keys if they were edited (not masked)
      if (youtubeApiKey && youtubeApiKey !== "••••••••••") payload.youtubeApiKey = youtubeApiKey;
      if (notionToken && notionToken !== "••••••••••") payload.notionToken = notionToken;

      const res = await apiRequest("POST", "/api/integrations/config", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/config"] });
      toast({ title: "✅ Configuración guardada", description: "Las credenciales se han guardado correctamente." });
      setYoutubeApiKey("");
      setNotionToken("");
      // Trigger Notion sync if configured
      if (notionDatabaseId || config?.hasNotion) {
        notionSyncMutation.mutate();
      }
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "No se pudo guardar la configuración", variant: "destructive" });
    },
  });

  // YouTube sync mutation
  const ytSyncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/integrations/youtube/sync");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/youtube/videos"] });
      toast({ title: "🎬 YouTube Sincronizado", description: `${data.synced} vídeos sincronizados correctamente.` });
    },
    onError: (err: any) => {
      toast({ title: "Error YouTube", description: err.message || "No se pudo sincronizar YouTube", variant: "destructive" });
    },
  });

  // Notion sync mutation
  const notionSyncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/integrations/notion/sync");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/notion/videos"] });
      toast({ title: "📅 Notion Sincronizado", description: `${data.synced} próximos vídeos sincronizados correctamente.` });
    },
    onError: (err: any) => {
      toast({ title: "Error Notion", description: err.message || "No se pudo sincronizar Notion", variant: "destructive" });
    },
  });

  const hasYoutube = config?.hasYoutube;
  const hasNotion = config?.hasNotion;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Settings className="h-5 w-5 text-primary" />
            Integraciones
          </DialogTitle>
          <DialogDescription>
            Conecta tu canal de YouTube y tu calendario de Notion para generar propuestas de patrocinio con métricas reales.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">

          {/* ─── YouTube Section ─────────────────────────────────────── */}
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="bg-red-500/5 border-b border-border px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Youtube className="h-5 w-5 text-red-500" />
                <span className="font-semibold text-foreground">YouTube Data API v3</span>
              </div>
              <div className="flex items-center gap-2">
                {hasYoutube ? (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 gap-1">
                    <CheckCircle className="h-3 w-3" /> Conectado
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <XCircle className="h-3 w-3" /> No configurado
                  </Badge>
                )}
                {hasYoutube && (
                  <Badge variant="outline" className="text-muted-foreground text-xs">
                    <Eye className="h-3 w-3 mr-1" />
                    {(ytVideos as any[]).length} vídeos
                  </Badge>
                )}
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <Label htmlFor="yt-key" className="text-sm font-medium">
                  YouTube API Key
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-xs text-primary hover:underline inline-flex items-center gap-0.5"
                  >
                    Google Cloud Console <ExternalLink className="h-3 w-3" />
                  </a>
                </Label>
                <Input
                  id="yt-key"
                  type="password"
                  value={youtubeApiKey}
                  onChange={(e) => setYoutubeApiKey(e.target.value)}
                  placeholder={config?.youtubeApiKey ? "•••••••••• (guardada)" : "AIzaSy..."}
                  className="mt-1 font-mono text-sm"
                />
              </div>

              <div>
                <Label htmlFor="yt-channel-id" className="text-sm font-medium">
                  ID del Canal de YouTube
                </Label>
                <Input
                  id="yt-channel-id"
                  value={youtubeChannelId}
                  onChange={(e) => setYoutubeChannelId(e.target.value)}
                  placeholder="UC..."
                  className="mt-1 font-mono text-sm"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="flex-1"
                >
                  {saveMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                  Guardar YouTube
                </Button>
                {hasYoutube && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => ytSyncMutation.mutate()}
                    disabled={ytSyncMutation.isPending}
                    className="gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${ytSyncMutation.isPending ? "animate-spin" : ""}`} />
                    {ytSyncMutation.isPending ? "Sincronizando..." : "Sincronizar"}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* ─── Notion Section ───────────────────────────────────────── */}
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="bg-slate-500/5 border-b border-border px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-500" />
                <span className="font-semibold text-foreground">Notion — Calendario de Contenidos</span>
              </div>
              <div className="flex items-center gap-2">
                {hasNotion ? (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 gap-1">
                    <CheckCircle className="h-3 w-3" /> Conectado
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <XCircle className="h-3 w-3" /> No configurado
                  </Badge>
                )}
                {hasNotion && (
                  <Badge variant="outline" className="text-muted-foreground text-xs">
                    <Eye className="h-3 w-3 mr-1" />
                    {(notionVideos as any[]).length} vídeos próximos
                  </Badge>
                )}
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <Label htmlFor="notion-token" className="text-sm font-medium">
                  Notion Integration Token
                  <a
                    href="https://www.notion.so/my-integrations"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-xs text-primary hover:underline inline-flex items-center gap-0.5"
                  >
                    Crear integración <ExternalLink className="h-3 w-3" />
                  </a>
                </Label>
                <Input
                  id="notion-token"
                  type="password"
                  value={notionToken}
                  onChange={(e) => setNotionToken(e.target.value)}
                  placeholder={config?.notionToken ? "•••••••••• (guardado)" : "secret_..."}
                  className="mt-1 font-mono text-sm"
                />
              </div>

              <div>
                <Label htmlFor="notion-db-id" className="text-sm font-medium">
                  ID o URL de la Base de Datos / Página
                </Label>
                <Input
                  id="notion-db-id"
                  value={notionDatabaseId}
                  onChange={(e) => setNotionDatabaseId(e.target.value)}
                  placeholder="https://notion.so/... o 32 caracteres hexadecimales"
                  className="mt-1 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Copia el enlace completo de tu base de datos o página de Notion.
                </p>
              </div>

              {hasNotion && (
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground p-0 h-auto font-normal flex items-center gap-1 hover:text-foreground"
                    onClick={() => setShowAdvancedNotion(!showAdvancedNotion)}
                  >
                    {showAdvancedNotion ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {showAdvancedNotion ? "Ocultar configuración de columnas" : "Mapeo de nombres de columnas (Opcional)"}
                  </Button>
                </div>
              )}

              {showAdvancedNotion && (
                <div className="grid grid-cols-2 gap-3 pt-1 p-3 bg-muted/30 rounded-lg border border-border/50 text-xs">
                  <div>
                    <Label className="text-xs text-muted-foreground">Propiedad Título</Label>
                    <Input
                      value={notionTitleProperty}
                      onChange={e => setNotionTitleProperty(e.target.value)}
                      className="mt-1 text-sm"
                      placeholder="Name / Nombre / Título"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Propiedad Fecha</Label>
                    <Input
                      value={notionDateProperty}
                      onChange={e => setNotionDateProperty(e.target.value)}
                      className="mt-1 text-sm"
                      placeholder="Date / Fecha"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Propiedad Estado</Label>
                    <Input
                      value={notionStatusProperty}
                      onChange={e => setNotionStatusProperty(e.target.value)}
                      className="mt-1 text-sm"
                      placeholder="Status / Estado"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Propiedad Nicho</Label>
                    <Input
                      value={notionNicheProperty}
                      onChange={e => setNotionNicheProperty(e.target.value)}
                      className="mt-1 text-sm"
                      placeholder="Niche / Nicho"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="flex-1"
                >
                  {saveMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                  Guardar Notion
                </Button>
                {hasNotion && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => notionSyncMutation.mutate()}
                    disabled={notionSyncMutation.isPending}
                    className="gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${notionSyncMutation.isPending ? "animate-spin" : ""}`} />
                    {notionSyncMutation.isPending ? "Sincronizando..." : "Sincronizar Ahora"}
                  </Button>
                )}
              </div>

              {/* ─── Synced Upcoming Videos List Preview ───────────────── */}
              {hasNotion && (
                <div className="mt-4 pt-3 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-indigo-500" /> Próximos Vídeos Sincronizados (Futuros)
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      {(notionVideos as any[]).length} vídeos
                    </span>
                  </div>

                  {(notionVideos as any[]).length === 0 ? (
                    <div className="bg-muted/40 rounded-lg p-3 text-center text-xs text-muted-foreground">
                      No hay vídeos futuros programados cargados. Haz clic en <strong>"Sincronizar Ahora"</strong> para cargar tu calendario.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {(notionVideos as any[]).map((vid: any, i: number) => {
                        const dateStr = vid.targetDate ? new Date(vid.targetDate).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : "Sin fecha";
                        return (
                          <div key={vid.id || i} className="flex items-center justify-between bg-card p-2 rounded border border-border text-xs gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground truncate">{vid.title}</p>
                              <div className="flex items-center gap-2 mt-0.5 text-muted-foreground">
                                <span>📅 {dateStr}</span>
                                {vid.nicho && <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px]">{vid.nicho}</span>}
                              </div>
                            </div>
                            <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                              {vid.status || "Planificado"}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ─── Status summary ──────────────────────────────────────── */}
          {(hasYoutube || hasNotion) && (
            <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">✨ Estado de las integraciones</p>
              {hasYoutube && (
                <p>🎬 YouTube: <span className="text-green-600 font-medium">{(ytVideos as any[]).length} vídeos sincronizados</span> — La IA usará automáticamente el mejor vídeo de cada nicho en las propuestas.</p>
              )}
              {hasNotion && (
                <p className="mt-1">📅 Notion: <span className="text-green-600 font-medium">{(notionVideos as any[]).length} próximos vídeos disponibles</span> — Podrás vender patrocinios en vídeos futuros de alto impacto.</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
