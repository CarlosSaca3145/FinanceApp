import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building, Mail, TrendingUp, Megaphone, ArrowUp, ArrowDown, PlaneTakeoff, Eye, RefreshCw, Calendar, Send, Sparkles, DollarSign } from "lucide-react";
import { getDashboardStats } from "@/lib/api";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { NotionVideosModal } from "@/components/modals/notion-videos-modal";
import { MarkVideoSoldModal } from "@/components/modals/mark-video-sold-modal";
import { formatDate, formatDateShort } from "@/lib/date-utils";

export function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNotionModal, setShowNotionModal] = useState(false);
  const [isMarkSoldOpen, setIsMarkSoldOpen] = useState(false);
  const [selectedVideoForSale, setSelectedVideoForSale] = useState<any>(null);

  const { data: notionVideos = [] } = useQuery<any[]>({
    queryKey: ["/api/integrations/notion/videos"],
    queryFn: async () => {
      const res = await fetch("/api/integrations/notion/videos", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const syncRepliesMutation = useMutation({
    mutationFn: () => import("@/lib/api").then(m => m.syncReplies()),
    onMutate: () => {
      toast({
        title: "Sync Started",
        description: "Checking Gmail for replies...",
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Sync Complete",
        description: res.success 
          ? `Successfully synchronized email replies. Found ${res.count} new replies.`
          : `Sync completed: ${res.error || "No new replies found."}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Error",
        description: error.message || "Failed to synchronize replies",
        variant: "destructive",
      });
    },
  });

  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: () => import("@/lib/api").then(m => m.getDashboardStats()),
  });

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <header className="bg-card border-b border-border px-4 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-foreground">Dashboard</h2>
              <p className="text-sm lg:text-base text-muted-foreground">Campaign overview and performance metrics</p>
            </div>
          </div>
        </header>
        <div className="p-4 lg:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 lg:p-6">
                  <div className="h-16 lg:h-20 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <header className="bg-card border-b border-border px-4 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-foreground">Dashboard</h2>
            <p className="text-sm lg:text-base text-muted-foreground">Campaign overview and performance metrics</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <Button 
              variant="outline"
              onClick={() => syncRepliesMutation.mutate()}
              disabled={syncRepliesMutation.isPending}
              className="flex items-center justify-center space-x-2 w-full sm:w-auto animate-in fade-in zoom-in duration-200"
              data-testid="button-sync-replies-dashboard"
            >
              <RefreshCw className={`h-4 w-4 ${syncRepliesMutation.isPending ? "animate-spin" : ""}`} />
              <span>{syncRepliesMutation.isPending ? "Syncing..." : "Sync Replies"}</span>
            </Button>
            <Button 
              className="flex items-center justify-center space-x-2 w-full sm:w-auto" 
              data-testid="button-bulk-send"
              onClick={() => setLocation("/brands")}
            >
              <PlaneTakeoff className="h-4 w-4" />
              <span>Send Emails</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground text-xs lg:text-sm font-medium">Total Brands</p>
                  <p className="text-xl lg:text-2xl font-bold text-foreground" data-testid="stat-total-brands">
                    {stats?.totalBrands || 0}
                  </p>
                </div>
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building className="h-5 w-5 lg:h-6 lg:w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="mt-3 lg:mt-4 flex items-center text-xs lg:text-sm">
                <span className="text-green-600 dark:text-green-400 flex items-center">
                  <ArrowUp className="h-3 w-3 mr-1" />
                  12%
                </span>
                <span className="text-muted-foreground ml-1">vs last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground text-xs lg:text-sm font-medium">Emails Sent</p>
                  <p className="text-xl lg:text-2xl font-bold text-foreground" data-testid="stat-emails-sent">
                    {stats?.emailsSent || 0}
                  </p>
                </div>
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="h-5 w-5 lg:h-6 lg:w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="mt-3 lg:mt-4 flex items-center text-xs lg:text-sm">
                <span className="text-green-600 dark:text-green-400 flex items-center">
                  <ArrowUp className="h-3 w-3 mr-1" />
                  8%
                </span>
                <span className="text-muted-foreground ml-1">vs last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground text-xs lg:text-sm font-medium">Open Rate</p>
                  <p className="text-xl lg:text-2xl font-bold text-foreground" data-testid="stat-open-rate">
                    {(stats as any)?.openRate || "0%"}
                  </p>
                </div>
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Eye className="h-5 w-5 lg:h-6 lg:w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <div className="mt-3 lg:mt-4 flex items-center text-xs lg:text-sm">
                <span className="text-green-600 dark:text-green-400 flex items-center">
                  <ArrowUp className="h-3 w-3 mr-1" />
                  15%
                </span>
                <span className="text-muted-foreground ml-1">vs last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground text-xs lg:text-sm font-medium">Response Rate</p>
                  <p className="text-xl lg:text-2xl font-bold text-foreground" data-testid="stat-response-rate">
                    {stats?.responseRate || "0%"}
                  </p>
                </div>
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-5 w-5 lg:h-6 lg:w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
              <div className="mt-3 lg:mt-4 flex items-center text-xs lg:text-sm">
                <span className="text-green-600 dark:text-green-400 flex items-center">
                  <ArrowUp className="h-3 w-3 mr-1" />
                  4%
                </span>
                <span className="text-muted-foreground ml-1">vs last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground text-xs lg:text-sm font-medium">Active Campaigns</p>
                  <p className="text-xl lg:text-2xl font-bold text-foreground" data-testid="stat-active-campaigns">
                    {stats?.activeCampaigns || 0}
                  </p>
                </div>
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Megaphone className="h-5 w-5 lg:h-6 lg:w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="mt-3 lg:mt-4 flex items-center text-xs lg:text-sm">
                <span className="text-red-600 dark:text-red-400 flex items-center">
                  <ArrowDown className="h-3 w-3 mr-1" />
                  2%
                </span>
                <span className="text-muted-foreground ml-1">vs last month</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── Notion Upcoming Videos Banner Card ──────────────────────────────── */}
        <Card className="border border-indigo-500/20 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-transparent">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 shrink-0">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold flex items-center flex-wrap gap-2">
                    📅 Calendario de Notion — Pipeline de Patrocinios
                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs">
                      🟢 {notionVideos.filter(v => !v.isSold && v.sponsorshipAvailable !== false && !/vendido|patrocinado|sold|sponsored/i.test(v.status || "")).length} Disponibles para Vender
                    </Badge>
                    <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-xs">
                      🤝 {notionVideos.filter(v => v.isSold || v.sponsorshipAvailable === false || /vendido|patrocinado|sold|sponsored/i.test(v.status || "")).length} Vendidos
                    </Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Gestiona tus vídeos en planificación: ofrece los disponibles a marcas o haz seguimiento de los ya vendidos.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-950/40 text-xs font-semibold shrink-0"
                onClick={() => setShowNotionModal(true)}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Explorar Vídeos ({notionVideos.length})
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {notionVideos.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground bg-card/60 rounded-lg border border-dashed">
                <p>No hay vídeos en planificación aún. Abre Ajustes de Integraciones y pulsa <strong>"Sincronizar Ahora"</strong>.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {notionVideos.slice(0, 4).map((vid: any, i: number) => {
                  const dateStr = vid.targetDate ? formatDateShort(vid.targetDate) : "Sin fecha";
                  const isSold = vid.isSold || vid.sponsorshipAvailable === false || /vendido|patrocinado|sold|sponsored/i.test(vid.status || "");

                  return (
                    <div key={vid.id || i} className={`bg-card p-3 rounded-lg border flex flex-col justify-between space-y-2 transition-colors shadow-2xs ${isSold ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border hover:border-indigo-500/40'}`}>
                      <div>
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <Badge variant="outline" className={`capitalize text-[10px] py-0 ${isSold ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : ''}`}>
                            {isSold ? "🤝 Vendido" : (vid.status || "Planificado")}
                          </Badge>
                          {vid.nicho && <span className="bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-medium">{vid.nicho}</span>}
                        </div>
                        <p className="font-semibold text-xs line-clamp-2 text-foreground">{vid.title}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px]">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-indigo-500" /> {dateStr}
                        </span>
                        {isSold ? (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">🤝 VENDIDO</span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[10px] px-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                              onClick={() => {
                                sessionStorage.setItem("selectedNotionVideo", JSON.stringify(vid));
                                setLocation("/brands");
                              }}
                              title="Ofrecer a Marca por Email"
                            >
                              <Send className="h-3 w-3 mr-0.5" /> Ofrecer
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[10px] px-1.5 text-emerald-600 border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold"
                              onClick={() => {
                                setSelectedVideoForSale(vid);
                                setIsMarkSoldOpen(true);
                              }}
                              title="Marcar Vídeo como Vendido"
                            >
                              <DollarSign className="h-3 w-3 mr-0.5" /> Vendido
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4" data-testid="recent-activity-list">
                {!stats?.recentActivities || stats.recentActivities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No recent activity</p>
                    <p className="text-xs">Activity will appear here when you start sending emails</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {stats.recentActivities.map((act: any) => (
                      <div key={act.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{act.brandName}</p>
                          <p className="text-xs text-muted-foreground truncate">{act.recipient}</p>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <span className="text-xs text-muted-foreground font-mono">
                            {act.sentAt ? formatDate(act.sentAt) : ""}
                          </span>
                          {act.opened ? (
                            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 text-[10px]">
                              👀 Opened
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 text-[10px]">
                              ✅ Sent
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4" data-testid="campaign-performance-list">
                {!stats?.campaignPerformance || stats.campaignPerformance.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No campaign data</p>
                    <p className="text-xs">Campaign performance will appear here after sending emails</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.campaignPerformance.map((camp: any) => (
                      <div key={camp.name} className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{camp.name}</p>
                          <p className="text-xs text-muted-foreground">{camp.sent} emails sent</p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-sm font-semibold text-foreground">{camp.openRate}</p>
                            <p className="text-[10px] text-muted-foreground">Open Rate</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Notion Videos Modal */}
      <NotionVideosModal 
        open={showNotionModal} 
        onOpenChange={setShowNotionModal} 
      />

      {/* Mark Video Sold Modal */}
      <MarkVideoSoldModal
        open={isMarkSoldOpen}
        onOpenChange={setIsMarkSoldOpen}
        video={selectedVideoForSale}
      />
    </div>
  );
}
