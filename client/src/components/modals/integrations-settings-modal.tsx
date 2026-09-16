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
      toast({ title: "📅 Notion Sincronizado", description: `${data.synced} vídeos próximos sincronizados.` });
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
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label htmlFor="youtube-api-key" className="text-sm font-medium">
                    YouTube Data API Key
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-xs text-primary hover:underline inline-flex items-center gap-0.5"
                    >
                      Obtener <ExternalLink className="h-3 w-3" />
                    </a>
                  </Label>
                  <Input
                    id="youtube-api-key"
                    type="password"
                    placeholder={hasYoutube ? "••••••••••  (guardada)" : "AIza..."}
                    value={youtubeApiKey}
                    onChange={e => setYoutubeApiKey(e.target.value)}
                    className="mt-1 font-mono text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="youtube-channel-id" className="text-sm font-medium">
                    Channel ID
                    <span className="ml-2 text-xs text-muted-foreground">(ej. UCxxxxxxxxxxxxxx)</span>
                  </Label>
                  <Input
                    id="youtube-channel-id"
                    placeholder="UCxxxxxxxxxxxxxx"
                    value={youtubeChannelId}
                    onChange={e => setYoutubeChannelId(e.target.value)}
                    className="mt-1 font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Encuéntralo en YouTube Studio → Configuración del canal → Información del canal
                  </p>
                </div>
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
                    {ytSyncMutation.isPending ? "Sincronizando..." : "Sincronizar Ahora"}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* ─── Notion Section ──────────────────────────────────────── */}
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="bg-gray-500/5 border-b border-border px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-foreground" />
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
                  placeholder={hasNotion ? "••••••••••  (guardado)" : "secret_..."}
                  value={notionToken}
                  onChange={e => setNotionToken(e.target.value)}
                  className="mt-1 font-mono text-sm"
                />
              </div>
              <div>
                <Label htmlFor="notion-db-id" className="text-sm font-medium">
                  Database ID
                  <span className="ml-2 text-xs text-muted-foreground">(ID de la base de datos de tu calendario)</span>
                </Label>
                <Input
                  id="notion-db-id"
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={notionDatabaseId}
                  onChange={e => setNotionDatabaseId(e.target.value)}
                  className="mt-1 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Copia el ID desde la URL de tu base de datos de Notion: notion.so/.../<strong>ID_AQUÍ</strong>?v=...
                </p>
              </div>

              {/* Advanced / property mapping */}
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowAdvancedNotion(!showAdvancedNotion)}
              >
                {showAdvancedNotion ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                Configuración avanzada de propiedades
              </button>

              {showAdvancedNotion && (
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border">
                  <div>
                    <Label className="text-xs text-muted-foreground">Propiedad Título</Label>
                    <Input
                      value={notionTitleProperty}
                      onChange={e => setNotionTitleProperty(e.target.value)}
                      className="mt-1 text-sm"
                      placeholder="Name"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Propiedad Fecha</Label>
                    <Input
                      value={notionDateProperty}
                      onChange={e => setNotionDateProperty(e.target.value)}
                      className="mt-1 text-sm"
                      placeholder="Date"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Propiedad Estado</Label>
                    <Input
                      value={notionStatusProperty}
                      onChange={e => setNotionStatusProperty(e.target.value)}
                      className="mt-1 text-sm"
                      placeholder="Status"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Propiedad Nicho</Label>
                    <Input
                      value={notionNicheProperty}
                      onChange={e => setNotionNicheProperty(e.target.value)}
                      className="mt-1 text-sm"
                      placeholder="Niche"
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
