import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  FileText, Plus, DollarSign, Calendar, CheckCircle2, Clock,
  Briefcase, Package, Sparkles, Download, Filter, Video, Tag,
  Building, Check, ArrowUpRight, TrendingUp, AlertCircle
} from "lucide-react";
import { MarkVideoSoldModal } from "@/components/modals/mark-video-sold-modal";
import { AddExternalDealModal } from "@/components/modals/add-external-deal-modal";
import { BarterProductModal } from "@/components/modals/barter-product-modal";
import { EditDealModal } from "@/components/modals/edit-deal-modal";
import { generatePDFReport } from "@/lib/pdf-export";
import type { Brand } from "@shared/schema";

function formatDateDMY(dateInput: any): string {
  if (!dateInput) return "TBD";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "TBD";
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "TBD";
  }
}

export default function SponsorshipsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [currentTab, setCurrentTab] = useState("deals");

  // Modals state
  const [isMarkSoldOpen, setIsMarkSoldOpen] = useState(false);
  const [selectedVideoForSale, setSelectedVideoForSale] = useState<any>(null);

  const [isAddExternalOpen, setIsAddExternalOpen] = useState(false);
  const [isBarterModalOpen, setIsBarterModalOpen] = useState(false);
  const [selectedBarterProduct, setSelectedBarterProduct] = useState<any>(null);

  const [isEditDealOpen, setIsEditDealOpen] = useState(false);
  const [selectedDealForEdit, setSelectedDealForEdit] = useState<any>(null);

  // Goal state
  const currentYearMonth = new Date().toISOString().slice(0, 7);
  const [targetGoal, setTargetGoal] = useState<string>("5000");

  // Data Queries
  const { data: reportData, isLoading: isLoadingReport } = useQuery({
    queryKey: ["/api/reports/summary", period],
    queryFn: async () => {
      const res = await fetch(`/api/reports/summary?period=${period}`, { credentials: "include" });
      if (!res.ok) throw new Error("Error al cargar informe");
      return res.json();
    },
  });

  const { data: goalData } = useQuery({
    queryKey: ["/api/goals", currentYearMonth],
    queryFn: async () => {
      const res = await fetch(`/api/goals/${currentYearMonth}`, { credentials: "include" });
      if (!res.ok) return { targetAmount: 5000 };
      return res.json();
    },
  });

  const { data: notionVideos = [] } = useQuery({
    queryKey: ["/api/integrations/notion/videos"],
    queryFn: async () => {
      const res = await fetch("/api/integrations/notion/videos", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: brands = [] } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
  });

  // Goal mutation
  const updateGoalMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await apiRequest("POST", "/api/goals", { yearMonth: currentYearMonth, targetAmount: amount });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      toast({ title: "🎯 Meta Actualizada", description: `Meta mensual guardada en $${targetGoal}` });
    },
  });

  // Deal update mutation (toggle status/payment)
  const updateDealMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PUT", `/api/deals/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      toast({ title: "✅ Estado Actualizado", description: "Se han guardado los cambios en el patrocinio." });
    },
  });

  // Brand status override mutation
  const updateBrandStatusMutation = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: string }) => {
      const res = await apiRequest("PATCH", `/api/brands/${id}/status`, { estado });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/summary"] });
      toast({ title: "✅ Marca Actualizada", description: "El estado de la marca se ha guardado." });
    },
  });

  // Barter delete mutation
  const deleteBarterMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/barter-products/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/barter-products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/summary"] });
      toast({ title: "Eliminado", description: "Producto eliminado del inventario." });
    },
  });

  // Goal Progress Calculation
  const currentTarget = Number(goalData?.targetAmount) || Number(targetGoal) || 5000;
  const currentAchieved = Number(reportData?.totalCashClosed) || 0;
  const goalPercent = Math.min(Math.round((currentAchieved / currentTarget) * 100), 100);

  const periodTitleMap = {
    daily: "Informe Diario (Hoy)",
    weekly: "Informe Semanal (Últimos 7 días)",
    monthly: "Informe Mensual (Últimos 30 días)",
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* ═══ Header ═══ */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-card via-card to-indigo-500/5 p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Departamento de Patrocinios
            </h1>
            <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-xs font-semibold">
              Saca Tech CRM
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión de acuerdos, entregables, cobros, inventario de canjes e informes en PDF
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Period filter */}
          <div className="flex bg-muted/60 p-1 rounded-xl border border-border text-xs font-semibold">
            {(["daily", "weekly", "monthly"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  period === p
                    ? "bg-card text-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "daily" ? "Hoy" : p === "weekly" ? "Semana" : "Mes"}
              </button>
            ))}
          </div>

          <Button
            onClick={() => reportData && generatePDFReport(reportData, periodTitleMap[period])}
            disabled={!reportData}
            variant="outline"
            className="gap-1.5 text-xs font-bold border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10"
          >
            <Download className="h-4 w-4" /> Exportar Informe PDF
          </Button>

          <Button
            onClick={() => setIsAddExternalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs font-semibold shadow-md shadow-indigo-500/20"
          >
            <Plus className="h-4 w-4" /> Registrar Patrocinio
          </Button>
        </div>
      </div>

      {/* ═══ Monthly Goal & Revenue Progress Bar ═══ */}
      <Card className="bg-card border-border shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base">Meta de Ingresos Mensuales</h3>
                <p className="text-xs text-muted-foreground">
                  Ingresos acumulados en patrocinios cerrados este mes
                </p>
              </div>
            </div>

            {/* Target Input */}
            <div className="flex items-center gap-2">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Meta ($):</Label>
              <Input
                type="number"
                value={targetGoal}
                onChange={(e) => setTargetGoal(e.target.value)}
                className="w-24 h-8 text-xs font-bold text-right"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateGoalMutation.mutate(Number(targetGoal))}
                className="h-8 text-xs px-2.5 font-semibold"
              >
                Guardar
              </Button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-emerald-600 dark:text-emerald-400">
                ${currentAchieved.toLocaleString()} cerrados
              </span>
              <span className="text-muted-foreground">
                {goalPercent}% completado de ${currentTarget.toLocaleString()}
              </span>
            </div>
            <Progress value={goalPercent} className="h-3 bg-muted" />
          </div>
        </CardContent>
      </Card>

      {/* ═══ KPI Stats Cards ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Emails */}
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase">Outreach & Emails</span>
              <Badge variant="outline" className="text-[10px] text-indigo-500">
                {reportData?.openRate || 0}% vistos
              </Badge>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-foreground">{reportData?.emailsSent || 0}</span>
              <span className="text-xs text-muted-foreground">enviados</span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground flex justify-between border-t border-border pt-2">
              <span>Vistos: <strong>{reportData?.emailsOpened || 0}</strong></span>
              <span>Respondidos: <strong className="text-emerald-600">{reportData?.repliesReceived || 0}</strong></span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Deals in Progress */}
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase">En Negociación</span>
              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                En Proceso
              </Badge>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                {reportData?.inProgressDeals || 0}
              </span>
              <span className="text-xs text-muted-foreground">marcas interesadas</span>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground border-t border-border pt-2">
              Propuestas enviadas pendientes de firma
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Total Cash Closed */}
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase">Patrocinio Cerrado</span>
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                {reportData?.closedDeals || 0} acuerdos
              </Badge>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                ${(reportData?.totalCashClosed || 0).toLocaleString()}
              </span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground flex justify-between border-t border-border pt-2">
              <span>Pagado: <strong>${(reportData?.totalPaidAmount || 0).toLocaleString()}</strong></span>
              <span>Por cobrar: <strong className="text-amber-600">${(reportData?.pendingPaymentAmount || 0).toLocaleString()}</strong></span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Product Barter Value */}
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase">Canje de Productos</span>
              <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-[10px]">
                MSRP / Venta
              </Badge>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-purple-600 dark:text-purple-400">
                ${(reportData?.totalCommercialBarter || 0).toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">MSRP comercial</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground border-t border-border pt-2 flex justify-between">
              <span>Vendido en efectivo:</span>
              <strong className="text-emerald-600">${(reportData?.totalBarterSold || 0).toLocaleString()}</strong>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ═══ Main Tabs ═══ */}
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-4">
        <TabsList className="bg-card border border-border p-1 rounded-xl">
          <TabsTrigger value="deals" className="text-xs font-semibold gap-1.5">
            <Briefcase className="h-4 w-4" /> Acuerdos & Entregables
          </TabsTrigger>
          <TabsTrigger value="notion" className="text-xs font-semibold gap-1.5">
            <Video className="h-4 w-4" /> Vídeos & Marcar Vendido
          </TabsTrigger>
          <TabsTrigger value="barter" className="text-xs font-semibold gap-1.5">
            <Package className="h-4 w-4" /> Canjes & Venta de Productos
          </TabsTrigger>
          <TabsTrigger value="brands" className="text-xs font-semibold gap-1.5">
            <Building className="h-4 w-4" /> Control de Marcas
          </TabsTrigger>
        </TabsList>

        {/* ═══ TAB 1: Deals & Deliverables CRM ═══ */}
        <TabsContent value="deals" className="space-y-4">
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="p-5 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Acuerdos del Departamento de Patrocinios</CardTitle>
                <CardDescription className="text-xs">
                  Seguimiento de entregables, precios acordados y cobros pendientes
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setIsAddExternalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1 font-semibold"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar Patrocinio
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {reportData?.dealsList?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[10px] font-bold">
                        <th className="p-3">Marca / Patrocinador</th>
                        <th className="p-3">Concepto / Vídeo</th>
                        <th className="p-3">Responsable</th>
                        <th className="p-3">Monto Acordado</th>
                        <th className="p-3">Fecha de Entrega</th>
                        <th className="p-3">Estado Entrega</th>
                        <th className="p-3">Estado Pago</th>
                        <th className="p-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {reportData.dealsList.map((d: any) => (
                        <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-3 font-bold text-foreground">
                            {d.brandName}
                            {d.source && (
                              <Badge variant="outline" className="block w-fit text-[9px] px-1 py-0 mt-0.5">
                                {d.source}
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            <span className="font-semibold text-foreground block">{d.dealName}</span>
                            {d.deliverables && (
                              <span className="text-[10px] text-muted-foreground">{d.deliverables.join(", ")}</span>
                            )}
                          </td>
                          <td className="p-3 font-semibold text-foreground">
                            👤 {d.assignedTo || "Carlos"}
                          </td>
                          <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                            ${(Number(d.agreedAmount) || 0).toLocaleString()}
                          </td>
                          <td className="p-3 font-medium text-foreground">
                            📅 {formatDateDMY(d.deliveryDate)}
                          </td>
                          <td className="p-3">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                updateDealMutation.mutate({
                                  id: d.id,
                                  data: { deliveryStatus: d.deliveryStatus === "delivered" ? "pending" : "delivered" },
                                })
                              }
                              className={`text-[11px] h-7 px-2 font-semibold ${
                                d.deliveryStatus === "delivered"
                                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                              }`}
                            >
                              {d.deliveryStatus === "delivered" ? "✅ Entregado" : "⏳ Pendiente"}
                            </Button>
                          </td>
                          <td className="p-3">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                updateDealMutation.mutate({
                                  id: d.id,
                                  data: {
                                    paymentStatus: d.paymentStatus === "paid" ? "pending" : "paid",
                                    paymentDate: d.paymentStatus === "paid" ? null : new Date(),
                                  },
                                })
                              }
                              className={`text-[11px] h-7 px-2 font-semibold ${
                                d.paymentStatus === "paid"
                                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                  : "bg-red-500/10 text-red-600 border border-red-500/20"
                              }`}
                            >
                              {d.paymentStatus === "paid" ? "✅ Pagado" : "💳 No Pagado"}
                            </Button>
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs text-indigo-600 border-indigo-500/30 hover:bg-indigo-50 dark:hover:bg-indigo-950 font-semibold"
                              onClick={() => {
                                setSelectedDealForEdit(d);
                                setIsEditDealOpen(true);
                              }}
                            >
                              Editar Todo
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Briefcase className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="font-semibold text-sm">No hay acuerdos registrados</p>
                  <p className="text-xs mt-1">Registra patrocinios o marca vídeos como vendidos para verlos aquí</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ TAB 2: Notion Videos & Mark as Sold ═══ */}
        <TabsContent value="notion" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground">Vídeos en Calendario de Notion</h3>
            <span className="text-xs text-muted-foreground">{notionVideos.length} vídeos sincronizados</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notionVideos.map((v: any) => (
              <Card key={v.notionPageId || v.id} className="bg-card border-border shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-foreground leading-snug">{v.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        📅 {v.targetDate ? new Date(v.targetDate).toLocaleDateString("es-ES") : "Sin fecha"} · {v.status}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] whitespace-nowrap">
                      {v.nicho || "Tech"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-[11px] text-muted-foreground">
                      {v.isSold ? "✅ Patrocinio asignado" : "🟢 Disponible para oferta"}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedVideoForSale(v);
                        setIsMarkSoldOpen(true);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-8 gap-1"
                    >
                      <DollarSign className="h-3.5 w-3.5" /> Marcar Vendido
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ═══ TAB 3: Barter Resales Inventory ═══ */}
        <TabsContent value="barter" className="space-y-4">
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="p-5 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Registro de Canjes de Productos & Ventas</CardTitle>
                <CardDescription className="text-xs">
                  Gestión de productos recibidos en canje, valor comercial MSRP y precio de reventa
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedBarterProduct(null);
                  setIsBarterModalOpen(true);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1 font-semibold"
              >
                <Plus className="h-3.5 w-3.5" /> Registrar Producto
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {reportData?.barterList?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[10px] font-bold">
                        <th className="p-3">Producto</th>
                        <th className="p-3">Marca / Patrocinador</th>
                        <th className="p-3">Valor Comercial (MSRP)</th>
                        <th className="p-3">Precio Vendido</th>
                        <th className="p-3">Estado Inventario</th>
                        <th className="p-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {reportData.barterList.map((p: any) => (
                        <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-3 font-bold text-foreground">{p.productName}</td>
                          <td className="p-3 text-muted-foreground">{p.brandName}</td>
                          <td className="p-3 font-semibold">${(Number(p.commercialValue) || 0).toLocaleString()}</td>
                          <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                            ${(Number(p.soldPrice) || 0).toLocaleString()}
                          </td>
                          <td className="p-3">
                            <Badge className={p.saleStatus === "sold" ? "bg-emerald-500/10 text-emerald-600 text-[10px]" : "bg-muted text-muted-foreground text-[10px]"}>
                              {p.saleStatus === "sold" ? "✅ Vendido" : "📦 En Inventario"}
                            </Badge>
                          </td>
                          <td className="p-3 text-right space-x-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs"
                              onClick={() => {
                                setSelectedBarterProduct(p);
                                setIsBarterModalOpen(true);
                              }}
                            >
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs text-red-500"
                              onClick={() => deleteBarterMutation.mutate(p.id)}
                            >
                              Eliminar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="font-semibold text-sm">No hay productos de canje en inventario</p>
                  <p className="text-xs mt-1">Registra los productos que recibas de marcas para controlar tu reventa</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ TAB 4: Brand Control & Manual Override ═══ */}
        <TabsContent value="brands" className="space-y-4">
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="p-5 border-b border-border">
              <CardTitle className="text-base font-bold">Control Manual de Marcas</CardTitle>
              <CardDescription className="text-xs">
                Marca manualmente si una empresa contestó, aceptó propuesta o rechazó
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[10px] font-bold">
                      <th className="p-3">Marca</th>
                      <th className="p-3">Nicho</th>
                      <th className="p-3">Contacto</th>
                      <th className="p-3">Estado Actual</th>
                      <th className="p-3 text-right">Cambio Manual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {brands.map((b) => (
                      <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-bold text-foreground">{b.marca}</td>
                        <td className="p-3 text-muted-foreground">{b.nicho}</td>
                        <td className="p-3 text-muted-foreground">{b.correo}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px]">
                            {b.estado || "Pending"}
                          </Badge>
                        </td>
                        <td className="p-3 text-right space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[10px] h-7 px-2 border-emerald-500/30 text-emerald-600"
                            onClick={() => updateBrandStatusMutation.mutate({ id: b.id, estado: "Responded" })}
                          >
                            ✓ Marcó Respuesta
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[10px] h-7 px-2 border-indigo-500/30 text-indigo-600"
                            onClick={() => updateBrandStatusMutation.mutate({ id: b.id, estado: "In Progress" })}
                          >
                            💬 Negociación
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[10px] h-7 px-2 border-purple-500/30 text-purple-600"
                            onClick={() => updateBrandStatusMutation.mutate({ id: b.id, estado: "Closed" })}
                          >
                            🤝 Cerrado
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══ Modals ═══ */}
      <MarkVideoSoldModal
        open={isMarkSoldOpen}
        onOpenChange={setIsMarkSoldOpen}
        video={selectedVideoForSale}
      />

      <AddExternalDealModal
        open={isAddExternalOpen}
        onOpenChange={setIsAddExternalOpen}
      />

      <BarterProductModal
        open={isBarterModalOpen}
        onOpenChange={setIsBarterModalOpen}
        product={selectedBarterProduct}
      />

      <EditDealModal
        open={isEditDealOpen}
        onOpenChange={setIsEditDealOpen}
        deal={selectedDealForEdit}
      />
    </div>
  );
}
