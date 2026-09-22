import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Search, ExternalLink, Send, Tag, SlidersHorizontal, DollarSign } from "lucide-react";
import { useLocation } from "wouter";
import { MarkVideoSoldModal } from "./mark-video-sold-modal";

export interface NotionVideo {
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

interface NotionVideosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectVideoForBrand?: (video: NotionVideo) => void;
}

export function NotionVideosModal({ open, onOpenChange, onSelectVideoForBrand }: NotionVideosModalProps) {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNiche, setSelectedNiche] = useState<string>("all");
  const [pipelineTab, setPipelineTab] = useState<"disponibles" | "vendidos" | "todos">("disponibles");
  const [sortBy, setSortBy] = useState<"date" | "title">("date");

  const [isMarkSoldOpen, setIsMarkSoldOpen] = useState(false);
  const [selectedVideoForSale, setSelectedVideoForSale] = useState<NotionVideo | null>(null);

  const { data: videos = [], isLoading } = useQuery<NotionVideo[]>({
    queryKey: ["/api/integrations/notion/videos"],
    queryFn: async () => {
      const res = await fetch("/api/integrations/notion/videos", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  // Split into available vs sold
  const { availableCount, soldCount } = useMemo(() => {
    let available = 0;
    let sold = 0;
    videos.forEach(v => {
      const isSold = v.isSold || !v.sponsorshipAvailable || (v.status && /vendido|patrocinado|sold|sponsored/i.test(v.status));
      if (isSold) sold++;
      else available++;
    });
    return { availableCount: available, soldCount: sold };
  }, [videos]);

  // Unique niches
  const niches = useMemo(() => {
    const set = new Set<string>();
    videos.forEach(v => {
      if (v.nicho) set.add(v.nicho);
    });
    return Array.from(set).sort();
  }, [videos]);

  // Filter & sort videos
  const filteredVideos = useMemo(() => {
    return videos
      .filter(v => {
        const isSold = v.isSold || !v.sponsorshipAvailable || (v.status && /vendido|patrocinado|sold|sponsored/i.test(v.status));
        
        // Pipeline tab filter
        if (pipelineTab === "disponibles" && isSold) return false;
        if (pipelineTab === "vendidos" && !isSold) return false;

        const matchesSearch = !searchTerm || 
          v.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
          (v.nicho && v.nicho.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesNiche = selectedNiche === "all" || v.nicho === selectedNiche;

        return matchesSearch && matchesNiche;
      })
      .sort((a, b) => {
        if (sortBy === "title") return a.title.localeCompare(b.title);
        const da = a.targetDate ? new Date(a.targetDate).getTime() : 0;
        const db = b.targetDate ? new Date(b.targetDate).getTime() : 0;
        return da - db;
      });
  }, [videos, searchTerm, selectedNiche, pipelineTab, sortBy]);

  const handleOfferToBrand = (video: NotionVideo) => {
    if (onSelectVideoForBrand) {
      onSelectVideoForBrand(video);
      onOpenChange(false);
    } else {
      sessionStorage.setItem("selectedNotionVideo", JSON.stringify(video));
      onOpenChange(false);
      setLocation("/brands");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-indigo-500" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  Calendario de Vídeos Disponibles para Patrocinio
                  <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 font-mono">
                    {videos.length} Vídeos Sincronizados
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  Explora y selecciona el vídeo ideal de tu calendario de Notion para ofrecérselo a marcas en tus propuestas.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Pipeline Tabs */}
          <div className="flex items-center gap-2 mt-4 bg-muted/40 p-1 rounded-lg border border-border">
            <button
              type="button"
              className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${pipelineTab === "disponibles" ? "bg-background text-indigo-600 dark:text-indigo-400 shadow-xs border border-border" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setPipelineTab("disponibles")}
            >
              <span>🟢 Disponibles para Vender</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{availableCount}</Badge>
            </button>

            <button
              type="button"
              className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${pipelineTab === "vendidos" ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-xs border border-border" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setPipelineTab("vendidos")}
            >
              <span>🤝 Vídeos Vendidos</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{soldCount}</Badge>
            </button>

            <button
              type="button"
              className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${pipelineTab === "todos" ? "bg-background text-foreground shadow-xs border border-border" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setPipelineTab("todos")}
            >
              <span>📋 Todos ({videos.length})</span>
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título o nicho..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            <Select value={selectedNiche} onValueChange={setSelectedNiche}>
              <SelectTrigger className="text-sm">
                <Tag className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Todos los nichos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los nichos</SelectItem>
                {niches.map(n => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 bg-muted/20">
          {isLoading ? (
            <div className="text-center py-16 text-muted-foreground space-y-3">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Cargando vídeos de Notion...</p>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border border-dashed p-8">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30 text-indigo-500" />
              <p className="font-semibold text-foreground text-base">No se encontraron vídeos</p>
              <p className="text-sm mt-1">Prueba a cambiar tus términos de búsqueda o filtros.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredVideos.map((video, idx) => {
                const dateFormatted = video.targetDate 
                  ? new Date(video.targetDate).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })
                  : "Fecha no asignada";

                const isSold = video.isSold || !video.sponsorshipAvailable || (video.status && /vendido|patrocinado|sold|sponsored/i.test(video.status));

                return (
                  <div
                    key={video.notionPageId || idx}
                    className={`bg-card transition-all duration-200 border rounded-xl p-4 flex flex-col justify-between shadow-xs group ${isSold ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border hover:border-indigo-500/50'}`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge 
                          variant="outline" 
                          className={`text-[11px] capitalize ${isSold ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900'}`}
                        >
                          {isSold ? "🤝 Vendido" : (video.status || "Planificado")}
                        </Badge>
                        {video.nicho && (
                          <Badge variant="secondary" className="text-[11px] font-medium">
                            🏷️ {video.nicho}
                          </Badge>
                        )}
                      </div>

                      <h4 className="font-semibold text-foreground text-sm line-clamp-2 group-hover:text-indigo-600 transition-colors">
                        {video.title}
                      </h4>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                      <div className="text-muted-foreground flex items-center gap-1 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                        <span>{dateFormatted}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {video.notionUrl && (
                          <a
                            href={video.notionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                            title="Abrir en Notion"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}

                        {isSold ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs py-1 px-2.5 font-semibold flex items-center gap-1">
                            🤝 VENDIDO
                          </Badge>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1 px-2.5 shadow-xs"
                              onClick={() => handleOfferToBrand(video)}
                            >
                              <Send className="h-3 w-3" />
                              Ofrecer
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs text-emerald-600 border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold gap-1 px-2.5"
                              onClick={() => {
                                setSelectedVideoForSale(video);
                                setIsMarkSoldOpen(true);
                              }}
                            >
                              <DollarSign className="h-3 w-3" />
                              Vendido
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <MarkVideoSoldModal
          open={isMarkSoldOpen}
          onOpenChange={setIsMarkSoldOpen}
          video={selectedVideoForSale}
        />
      </DialogContent>
    </Dialog>
  );
}
