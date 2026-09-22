import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Calendar, Video, CheckCircle2, Tag, FileText } from "lucide-react";
import type { Brand } from "@shared/schema";

interface MarkVideoSoldModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: {
    notionPageId?: string;
    id?: string;
    title: string;
    targetDate?: string | Date | null;
  } | null;
}

export function MarkVideoSoldModal({ open, onOpenChange, video }: MarkVideoSoldModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [brandName, setBrandName] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState<string>("custom");
  const [agreedAmount, setAgreedAmount] = useState<string>("500");
  const [deliveryDate, setDeliveryDate] = useState<string>(
    video?.targetDate ? new Date(video.targetDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]
  );
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid">("pending");
  const [paymentDate, setPaymentDate] = useState<string>("");
  const [assignedTo, setAssignedTo] = useState("Carlos");
  const [selectedDeliverables, setSelectedDeliverables] = useState<string[]>(["Integración 60-90s"]);
  const [notes, setNotes] = useState("");

  const { data: brands = [] } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
    enabled: open,
  });

  const availableDeliverables = [
    "Integración 60-90s (Horizontal)",
    "Vídeo Dedicado Completo",
    "Short / Reel / TikTok Vertical",
    "Mención en Redes & Comunidad",
    "Licencia de Uso de Vídeo",
  ];

  const toggleDeliverable = (item: string) => {
    setSelectedDeliverables(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const markSoldMutation = useMutation({
    mutationFn: async () => {
      const bName = selectedBrandId !== "custom"
        ? brands.find(b => b.id === selectedBrandId)?.marca || brandName
        : brandName;

      const res = await apiRequest("POST", "/api/videos/mark-sold", {
        videoNotionId: video?.notionPageId || video?.id,
        videoTitle: video?.title,
        brandId: selectedBrandId !== "custom" ? selectedBrandId : null,
        brandName: bName,
        agreedAmount: Number(agreedAmount) || 0,
        deliveryDate: deliveryDate ? deliveryDate : null,
        paymentStatus,
        paymentDate: paymentDate ? paymentDate : null,
        deliverables: selectedDeliverables,
        assignedTo: assignedTo || null,
        notes,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/notion/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/summary"] });
      toast({
        title: "🎉 Patrocinio Registrado",
        description: `El vídeo "${video?.title}" ha sido marcado como vendido.`,
      });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Error al registrar patrocinio", variant: "destructive" });
    },
  });

  if (!video) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Marcar Vídeo como Vendido</DialogTitle>
              <DialogDescription className="text-xs">
                Registra los detalles del patrocinio cerrado para este vídeo
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Video Title Summary */}
          <div className="p-3 bg-muted/40 rounded-xl border border-border">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">🎬 Vídeo Vendido</p>
            <p className="text-sm font-bold text-foreground mt-0.5">{video.title}</p>
          </div>

          {/* Brand Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">🏢 Marca Compradora / Patrocinador</Label>
            <Select
              value={selectedBrandId}
              onValueChange={(val) => {
                setSelectedBrandId(val);
                if (val !== "custom") {
                  const b = brands.find(item => item.id === val);
                  if (b) setBrandName(b.marca);
                }
              }}
            >
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Selecciona una marca existente..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">✏️ Escribir nombre de marca personalizada...</SelectItem>
                {brands.map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.marca} ({b.nicho})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedBrandId === "custom" && (
              <Input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Nombre del patrocinador (ej: Anker, DJI, ASUS)"
                className="text-xs mt-2"
              />
            )}
          </div>

          {/* Agreed Amount ($) & Delivery Target Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">💰 Precio Acordado ($ / €)</Label>
              <div className="relative mt-1">
                <DollarSign className="h-3.5 w-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  type="number"
                  value={agreedAmount}
                  onChange={(e) => setAgreedAmount(e.target.value)}
                  placeholder="500"
                  className="text-xs pl-8 font-bold"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">📅 Fecha Limite de Entrega</Label>
              <Input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="text-xs mt-1"
              />
            </div>
          </div>

          {/* Payment Status & Expected Payment Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">💳 Estado del Pago</Label>
              <Select value={paymentStatus} onValueChange={(val: any) => setPaymentStatus(val)}>
                <SelectTrigger className="text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">⏳ Pendiente de Pago</SelectItem>
                  <SelectItem value="paid">✅ Pagado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">📅 Fecha de Pago</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="text-xs mt-1"
              />
            </div>
          </div>

          {/* Person Responsible */}
          <div>
            <Label className="text-xs font-semibold">👤 Persona Encargada de la Entrega</Label>
            <Input
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="Ej: Carlos / Carlos Jr"
              className="text-xs mt-1"
            />
          </div>

          {/* Negotiated Deliverables */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">📦 Entregables Negociados</Label>
            <div className="flex flex-wrap gap-1.5">
              {availableDeliverables.map(deliv => {
                const isSelected = selectedDeliverables.includes(deliv);
                return (
                  <button
                    key={deliv}
                    type="button"
                    onClick={() => toggleDeliverable(deliv)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                      isSelected
                        ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-emerald-400 font-semibold"
                        : "bg-card border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {isSelected ? "✓ " : "+ "}{deliv}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs font-semibold">📝 Notas adicionales</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles del contrato, condiciones especiales de la marca..."
              className="text-xs min-h-[60px] mt-1"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => markSoldMutation.mutate()}
            disabled={markSoldMutation.isPending || (!brandName && selectedBrandId === "custom")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5"
          >
            {markSoldMutation.isPending ? "Registrando..." : "Guardar Patrocinio Cerrado"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
