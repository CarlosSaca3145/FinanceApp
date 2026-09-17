import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import {
  Settings,
  Mail,
  Youtube,
  FileText,
  CheckCircle,
  XCircle,
  ExternalLink,
  RefreshCw,
  Send,
  Save,
  Key,
  Database,
  HelpCircle,
} from "lucide-react";

export function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [youtubeApiKey, setYoutubeApiKey] = useState("");
  const [youtubeChannelId, setYoutubeChannelId] = useState("UCd7y3M4yv5fA7S9hFkE4S_w");
  const [notionToken, setNotionToken] = useState("");
  const [notionDatabaseId, setNotionDatabaseId] = useState("");
  const [smtpEmail, setSmtpEmail] = useState("c@saca.technology");
  const [smtpPassword, setSmtpPassword] = useState("");

  // Load existing config
  const { data: config, isLoading } = useQuery({
    queryKey: ["/api/integrations/config"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/integrations/config");
      return res.json();
    },
  });

  // Load YouTube count
  const { data: ytVideos = [] } = useQuery({
    queryKey: ["/api/integrations/youtube/videos"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/integrations/youtube/videos");
      return res.json();
    },
  });

  // Load Notion count
  const { data: notionVideos = [] } = useQuery({
    queryKey: ["/api/integrations/notion/videos"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/integrations/notion/videos");
      return res.json();
    },
  });

  useEffect(() => {
    if (config) {
      setYoutubeChannelId(config.youtubeChannelId || "UCd7y3M4yv5fA7S9hFkE4S_w");
      setNotionDatabaseId(config.notionDatabaseId || "");
      setSmtpEmail(config.smtpEmail || "c@saca.technology");
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
        smtpEmail,
      };
      if (youtubeApiKey && youtubeApiKey !== "••••••••••") payload.youtubeApiKey = youtubeApiKey;
      if (notionToken && notionToken !== "••••••••••") payload.notionToken = notionToken;
      if (smtpPassword && smtpPassword !== "••••••••••") payload.smtpPassword = smtpPassword;

      const res = await apiRequest("POST", "/api/integrations/config", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/config"] });
      toast({ title: "✅ Ajustes guardados", description: "Tus claves y configuración de SMTP han sido actualizadas correctamente." });
      setYoutubeApiKey("");
      setNotionToken("");
      setSmtpPassword("");
    },
    onError: (err: any) => {
      toast({ title: "❌ Error al guardar", description: err.message || "No se pudo guardar la configuración", variant: "destructive" });
    },
  });

  // Test email mutation
  const testEmailMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/integrations/email/test", { to: smtpEmail });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "📧 Correo Enviado Exitosamente", description: data.message || `Email enviado a ${smtpEmail} vía Gmail SMTP` });
    },
    onError: (err: any) => {
      toast({ title: "❌ Error de Envío SMTP", description: err.message || "No se pudo autenticar con Gmail. Revisa la Contraseña de Aplicación.", variant: "destructive" });
    },
  });

  // YouTube sync
  const ytSyncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/integrations/youtube/sync");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/youtube/videos"] });
      toast({ title: "🎬 Sincronización Completa", description: `${data.synced} vídeos históricos actualizados.` });
    },
    onError: (err: any) => {
      toast({ title: "Error YouTube", description: err.message, variant: "destructive" });
    },
  });

  // Notion sync
  const notionSyncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/integrations/notion/sync");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/notion/videos"] });
      toast({ title: "📅 Notion Actualizado", description: `${data.synced} propuestas sincronizadas.` });
    },
    onError: (err: any) => {
      toast({ title: "Error Notion", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Settings className="h-6 w-6 text-primary" />
            Ajustes & Integraciones
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configura tus credenciales de Gmail SMTP, YouTube API y Notion para automatizar correos y análisis.
          </p>
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="gap-2 shadow-sm"
          size="lg"
        >
          {saveMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar Todos los Ajustes
        </Button>
      </div>

      {/* Grid of integration cards */}
      <div className="grid grid-cols-1 gap-6">

        {/* 1. Gmail SMTP Card */}
        <Card className="border-border shadow-sm overflow-hidden">
          <CardHeader className="bg-indigo-500/5 border-b border-border pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Correo Saliente SMTP (Gmail / Google Workspace)</CardTitle>
                  <CardDescription className="text-xs">
                    Envía emails de patrocinio directamente desde tu dirección profesional <strong>c@saca.technology</strong>.
                  </CardDescription>
                </div>
              </div>
              {config?.hasSmtp ? (
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1.5 py-1 px-3">
                  <CheckCircle className="h-3.5 w-3.5" /> Conectado & Activo
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1.5 py-1 px-3">
                  <XCircle className="h-3.5 w-3.5" /> Pendiente de App Password
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="page-smtp-email" className="text-xs font-semibold text-foreground">
                  Correo Emisor
                </Label>
                <Input
                  id="page-smtp-email"
                  value={smtpEmail}
                  onChange={(e) => setSmtpEmail(e.target.value)}
                  placeholder="c@saca.technology"
                  className="mt-1 font-mono text-sm"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Dirección que aparecerá como remitente ante las marcas.
                </p>
              </div>

              <div>
                <Label htmlFor="page-smtp-pass" className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Contraseña de Aplicación de 16 caracteres</span>
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-normal text-[11px]"
                  >
                    Obtener en Google <ExternalLink className="h-3 w-3" />
                  </a>
                </Label>
                <Input
                  id="page-smtp-pass"
                  type="password"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  placeholder={config?.smtpPassword ? "•••••••••••••••• (guardada)" : "Pega tu App Password aquí (ej: cksn vhgq...)"}
                  className="mt-1 font-mono text-sm"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Contraseña generada en tu cuenta de Google (Seguridad &gt; Verificación en 2 pasos &gt; Contraseñas de aplicaciones).
                </p>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
              <HelpCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>¿Cómo generar tu Contraseña de Aplicación de Gmail?</strong>
                <ol className="list-decimal ml-4 mt-1 space-y-0.5 text-[11px]">
                  <li>Ve a tu cuenta Google (<strong>c@saca.technology</strong>) en <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline font-medium">myaccount.google.com/apppasswords</a>.</li>
                  <li>Asigna un nombre (ej. <em>Saca Tech App</em>) y haz clic en <strong>Crear</strong>.</li>
                  <li>Copia el código de 16 letras (ej. <code>cksn vhgq hbin kfzf</code>), pégalo en el campo anterior y pulsa <strong>Guardar Ajustes</strong>.</li>
                </ol>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Prueba el envío real para comprobar que tus credenciales de Gmail funcionan.
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testEmailMutation.mutate()}
                  disabled={testEmailMutation.isPending}
                  className="gap-1.5"
                >
                  {testEmailMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Probar Envío de Email
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. YouTube Integration Card */}
        <Card className="border-border shadow-sm overflow-hidden">
          <CardHeader className="bg-red-500/5 border-b border-border pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-500/10 rounded-xl text-red-600 dark:text-red-400">
                  <Youtube className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Integración YouTube Data API</CardTitle>
                  <CardDescription className="text-xs">
                    Busca automáticamente vídeos históricos en tu canal y calcula el Social Proof de visualizaciones esperadas.
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {ytVideos.length > 0 && (
                  <Badge variant="outline" className="text-xs font-normal">
                    {ytVideos.length} vídeos en catálogo
                  </Badge>
                )}
                {config?.hasYoutube ? (
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1.5 py-1 px-3">
                    <CheckCircle className="h-3.5 w-3.5" /> Conectado
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1.5 py-1 px-3">
                    Modo Demostración / Canal Predeterminado
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="page-yt-channel" className="text-xs font-semibold text-foreground">
                  ID del Canal de YouTube
                </Label>
                <Input
                  id="page-yt-channel"
                  value={youtubeChannelId}
                  onChange={(e) => setYoutubeChannelId(e.target.value)}
                  placeholder="UCd7y3M4yv5fA7S9hFkE4S_w"
                  className="mt-1 font-mono text-sm"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  ID de tu canal principal (Saca Tech).
                </p>
              </div>

              <div>
                <Label htmlFor="page-yt-key" className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>YouTube Data API v3 Key (Opcional)</span>
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 font-normal text-[11px]"
                  >
                    Google Cloud Console <ExternalLink className="h-3 w-3" />
                  </a>
                </Label>
                <Input
                  id="page-yt-key"
                  type="password"
                  value={youtubeApiKey}
                  onChange={(e) => setYoutubeApiKey(e.target.value)}
                  placeholder={config?.hasYoutube ? "•••••••••••••••• (guardada)" : "AIzaSy..."}
                  className="mt-1 font-mono text-sm"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Clave API personal para sincronizar métricas sin límites.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Actualiza las métricas y reproducciones de tus vídeos públicos.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => ytSyncMutation.mutate()}
                disabled={ytSyncMutation.isPending}
                className="gap-1.5"
              >
                {ytSyncMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Sincronizar Vídeos de YouTube
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 3. Notion Integration Card */}
        <Card className="border-border shadow-sm overflow-hidden">
          <CardHeader className="bg-emerald-500/5 border-b border-border pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Integración Notion Calendario de Contenidos</CardTitle>
                  <CardDescription className="text-xs">
                    Importa tus vídeos planificados de Notion para ofrecerlos a marcas patrocinadoras.
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {notionVideos.length > 0 && (
                  <Badge variant="outline" className="text-xs font-normal">
                    {notionVideos.length} vídeos planificados
                  </Badge>
                )}
                {config?.hasNotion ? (
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1.5 py-1 px-3">
                    <CheckCircle className="h-3.5 w-3.5" /> Conectado
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1.5 py-1 px-3">
                    Pendiente de Token / Base de Datos
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="page-notion-token" className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Notion Integration Token</span>
                  <a
                    href="https://www.notion.so/my-integrations"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-normal text-[11px]"
                  >
                    Crear en Notion <ExternalLink className="h-3 w-3" />
                  </a>
                </Label>
                <Input
                  id="page-notion-token"
                  type="password"
                  value={notionToken}
                  onChange={(e) => setNotionToken(e.target.value)}
                  placeholder={config?.hasNotion ? "•••••••••••••••• (guardada)" : "secret_..."}
                  className="mt-1 font-mono text-sm"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Token secreto de tu integración personalizada en Notion.
                </p>
              </div>

              <div>
                <Label htmlFor="page-notion-db" className="text-xs font-semibold text-foreground">
                  ID o Enlace de la Base de Datos Notion
                </Label>
                <Input
                  id="page-notion-db"
                  value={notionDatabaseId}
                  onChange={(e) => setNotionDatabaseId(e.target.value)}
                  placeholder="https://notion.so/workspace/1234567890abcdef..."
                  className="mt-1 font-mono text-sm"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Pega el ID o la URL completa de tu tabla de Notion.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Filtra automáticamente vídeos horizontales en fase de Escritura (excluyendo publicados e ideas).
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => notionSyncMutation.mutate()}
                disabled={notionSyncMutation.isPending}
                className="gap-1.5"
              >
                {notionSyncMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Sincronizar Noticias de Notion
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Save Button Footer */}
      <div className="flex justify-end pt-4 border-t border-border">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="gap-2 px-6 shadow-sm"
          size="lg"
        >
          {saveMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar Todos los Cambios
        </Button>
      </div>
    </div>
  );
}

export default SettingsPage;
