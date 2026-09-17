import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, Calendar, Youtube, Filter, PlayCircle, Eye, Search, Clock, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

import type { NotionUpcomingVideo, YoutubeVideo } from "@shared/schema";

export function Content() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNiche, setSelectedNiche] = useState<string>("all");

  const { data: notionVideos = [], isLoading: isLoadingNotion } = useQuery<NotionUpcomingVideo[]>({
    queryKey: ["/api/integrations/notion/videos"],
  });

  const { data: youtubeVideos = [], isLoading: isLoadingYoutube } = useQuery<YoutubeVideo[]>({
    queryKey: ["/api/integrations/youtube/videos"],
  });

  // Extract unique niches from both sources
  const allNiches = useMemo(() => {
    const niches = new Set<string>();
    notionVideos.forEach(v => v.nicho && niches.add(v.nicho));
    youtubeVideos.forEach(v => v.nicho && niches.add(v.nicho));
    return Array.from(niches).sort();
  }, [notionVideos, youtubeVideos]);

  // Filter Notion Videos
  const filteredNotion = useMemo(() => {
    return notionVideos
      .filter(v => {
        const matchesSearch = v.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesNiche = selectedNiche === "all" || v.nicho === selectedNiche;
        return matchesSearch && matchesNiche;
      })
      .sort((a, b) => {
        if (!a.targetDate) return 1;
        if (!b.targetDate) return -1;
        return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
      });
  }, [notionVideos, searchQuery, selectedNiche]);

  // Filter and Group YouTube Videos by Niche
  const filteredYoutube = useMemo(() => {
    const filtered = youtubeVideos.filter(v => {
      const matchesSearch = v.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesNiche = selectedNiche === "all" || v.nicho === selectedNiche;
      return matchesSearch && matchesNiche;
    });

    const grouped: Record<string, YoutubeVideo[]> = {};
    filtered.forEach(v => {
      const niche = v.nicho || "Sin Nicho";
      if (!grouped[niche]) grouped[niche] = [];
      grouped[niche].push(v);
    });

    // Sort videos within each niche by publish date
    Object.keys(grouped).forEach(k => {
      grouped[k].sort((a, b) => {
        if (!a.publishedAt) return 1;
        if (!b.publishedAt) return -1;
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      });
    });

    return grouped;
  }, [youtubeVideos, searchQuery, selectedNiche]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "Fecha por confirmar";
    return format(new Date(date), "d MMM, yyyy", { locale: es });
  };

  const getStatusColor = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case "published":
      case "publicado":
        return "bg-green-500/10 text-green-700 hover:bg-green-500/20";
      case "editing":
      case "editando":
        return "bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20";
      case "recording":
      case "grabando":
        return "bg-orange-500/10 text-orange-700 hover:bg-orange-500/20";
      case "planned":
      case "planificado":
        return "bg-blue-500/10 text-blue-700 hover:bg-blue-500/20";
      default:
        return "bg-gray-500/10 text-gray-700 hover:bg-gray-500/20";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contenido</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona tu calendario de Notion y explora tu catálogo histórico de YouTube.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por título..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={selectedNiche} onValueChange={setSelectedNiche}>
          <SelectTrigger className="w-full sm:w-[250px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtrar por nicho" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los nichos</SelectItem>
            {allNiches.map(niche => (
              <SelectItem key={niche} value={niche}>{niche}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="notion" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="notion" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendario Notion
          </TabsTrigger>
          <TabsTrigger value="youtube" className="flex items-center gap-2">
            <Youtube className="h-4 w-4" />
            Catálogo YouTube
          </TabsTrigger>
        </TabsList>

        {/* NOTION TAB */}
        <TabsContent value="notion" className="space-y-4">
          {isLoadingNotion ? (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              Cargando calendario...
            </div>
          ) : filteredNotion.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center h-48 text-center p-6">
                <FileText className="h-10 w-10 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No se encontraron vídeos planificados.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredNotion.map((video) => (
                <Card key={video.id} className="group overflow-hidden flex flex-col hover:border-primary/50 transition-colors">
                  <div className="h-2 w-full bg-gradient-to-r from-blue-500/20 to-indigo-500/20" />
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <Badge className={getStatusColor(video.status)} variant="outline">
                        {video.status || "Planned"}
                      </Badge>
                      {video.sponsorshipAvailable && (
                        <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 shrink-0">
                          Sponsor
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-base line-clamp-2 leading-tight" title={video.title}>
                      {video.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 flex-grow">
                    <div className="flex items-center text-sm text-muted-foreground mb-1">
                      <Calendar className="h-3.5 w-3.5 mr-2 shrink-0" />
                      {formatDate(video.targetDate)}
                    </div>
                    {video.nicho && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Filter className="h-3.5 w-3.5 mr-2 shrink-0" />
                        <span className="truncate">{video.nicho}</span>
                      </div>
                    )}
                  </CardContent>
                  {video.notionUrl && (
                    <CardFooter className="p-4 pt-0">
                      <Button variant="outline" className="w-full" size="sm" asChild>
                        <a href={video.notionUrl} target="_blank" rel="noopener noreferrer">
                          Ver en Notion
                          <ExternalLink className="h-3.5 w-3.5 ml-2" />
                        </a>
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* YOUTUBE TAB */}
        <TabsContent value="youtube" className="space-y-8">
          {isLoadingYoutube ? (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              Cargando catálogo...
            </div>
          ) : Object.keys(filteredYoutube).length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center h-48 text-center p-6">
                <Youtube className="h-10 w-10 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No se encontraron vídeos de YouTube.</p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(filteredYoutube).map(([niche, videos]) => (
              <div key={niche} className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <h2 className="text-xl font-semibold">{niche}</h2>
                  <Badge variant="secondary" className="rounded-full">{videos.length}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {videos.map(video => (
                    <Card key={video.id} className="overflow-hidden group flex flex-col hover:shadow-md transition-shadow">
                      {video.thumbnailUrl && (
                        <div className="relative aspect-video w-full overflow-hidden bg-muted">
                          <img 
                            src={video.thumbnailUrl} 
                            alt={video.title}
                            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                          />
                          {video.duration && (
                            <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
                              {video.duration.replace("PT", "").replace("H", ":").replace("M", ":").replace("S", "")}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <a href={video.url} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <PlayCircle className="h-10 w-10 text-white drop-shadow-md" />
                            </a>
                          </div>
                        </div>
                      )}
                      <CardContent className="p-4 flex flex-col flex-grow">
                        <h3 className="font-medium text-sm line-clamp-2 mb-2 flex-grow" title={video.title}>
                          {video.title}
                        </h3>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-2 border-t">
                          <div className="flex items-center gap-1" title={`${video.viewCount || 0} reproducciones`}>
                            <Eye className="h-3.5 w-3.5" />
                            {formatNumber(video.viewCount || 0)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDate(video.publishedAt)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
