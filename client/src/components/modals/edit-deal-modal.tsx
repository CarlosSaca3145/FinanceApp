import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Briefcase, Trash2 } from "lucide-react";
import type { Deal } from "@shared/schema";

interface EditDealModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: Deal | null;
}

function formatDateDMY(dateInput: any): string {
  if (!dateInput) return "";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "";
  }
}

export function EditDealModal({ open, onOpenChange, deal }: EditDealModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [brandName, setBrandName] = useState("");
  const [dealName, setDealName] = useState("");
  const [source, setSource] = useState("inbound");
  const [agreedAmount, setAgreedAmount] = useState<string>("0");
  const [deliveryDate, setDeliveryDate] = useState<string>("");
  const [deliveryStatus, setDeliveryStatus] = useState<"pending" | "delivered">("pending");
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid">("pending");
  const [paymentDate, setPaymentDate] = useState<string>("");
  const [assignedTo, setAssignedTo] = useState("Carlos");
  const [selectedDeliverables, setSelectedDeliverables] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const availableDeliverables = [
    "Integración 60-90s (Horizontal)",
    "Vídeo Dedicado Completo",
    "Short / Reel / TikTok Vertical",
    "Mención en Redes & Comunidad",
    "Licencia de Uso de Vídeo",
  ];

  useEffect(() => {
    if (deal) {
      setBrandName(deal.brandName || "");
      setDealName(deal.dealName || "");
      setSource(deal.source || "inbound");
      setAgreedAmount(String(deal.agreedAmount || 0));
      setDeliveryDate(
        deal.deliveryDate ? new Date(deal.deliveryDate).toISOString().split("T")[0] : ""
      );
      setDeliveryStatus((deal.deliveryStatus as "pending" | "delivered") || "pending");
      setPaymentStatus((deal.paymentStatus as "pending" | "paid") || "pending");
      setPaymentDate(
        deal.paymentDate ? new Date(deal.paymentDate).toISOString().split("T")[0] : ""
      );
      setAssignedTo(deal.assignedTo || "Carlos");
      setSelectedDeliverables(deal.deliverables || ["Integración 60-90s"]);
      setNotes(deal.notes || "");
    }
  }, [deal, open]);

  const toggleDeliverable = (item: string) => {
    setSelectedDeliverables((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const updateDealMutation = useMutation({
    mutationFn: async () => {
      if (!deal) return;
      const res = await apiRequest("PUT", `/api/deals/${deal.id}`, {
        brandName,
        dealName,
        source,
        agreedAmount: Number(agreedAmount) || 0,
        deliveryDate: deliveryDate ? deliveryDate : null,
        deliveryStatus,
        paymentStatus,
        paymentDate: paymentDate ? paymentDate : null,
        paymentAmount: paymentStatus === "paid" ? Number(agreedAmount) || 0 : 0,
        assignedTo: assignedTo || null,
        deliverables: selectedDeliverables,
        notes: notes || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/summary"] });
      toast({
        title: "✅ Acordado Actualizado",
        description: `Se han guardado los cambios para "${brandName}".`,
      });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Error al actualizar acuerdo",
        variant: "destructive",
      });
    },
  });

  const deleteDealMutation = useMutation({
    mutationFn: async () => {
      if (!deal) return;
      await apiRequest("DELETE", `/api/deals/${deal.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/summary"] });
      toast({
        title: "🗑️ Eliminar Acuerdo",
        description: "El acuerdo ha sido eliminado del registro.",
      });
      onOpenChange(false);
    },
  });

  if (!deal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Briefcase className="h-5 w-5 text-indigo-600" />
            Editar Patrocinio / Acuerdo
          </DialogTitle>
          <DialogDescription className="text-xs">
            Modifica todos los campos del acuerdo (Marca, Entregables, Precios, Fechas y Responsable).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Brand Name & Source */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">🏢 Marca / Patrocinador</Label>
              <Input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Ej: Samsung"
                className="text-xs mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">📍 Origen del Acuerdo</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbound">📩 Email Entrante (Inbound)</SelectItem>
                  <SelectItem value="cold_outreach">📤 Cold Outreach</SelectItem>
                  <SelectItem value="agency">🏢 Agencia / Manager</SelectItem>
                  <SelectItem value="referral">🤝 Recomendación / DM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Deal / Concept Name */}
          <div>
            <Label className="text-xs font-semibold">📦 Nombre o Concepto del Acuerdo</Label>
            <Input
              value={dealName}
              onChange={(e) => setDealName(e.target.value)}
              placeholder="Ej: Integración Galaxy S26 Ultra"
              className="text-xs mt-1"
            />
          </div>

          {/* Agreed Amount & Delivery Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">💰 Precio Acordado ($ / €)</Label>
              <div className="relative mt-1">
                <DollarSign className="h-3.5 w-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  type="number"
                  value={agreedAmount}
                  onChange={(e) => setAgreedAmount(e.target.value)}
                  className="text-xs pl-8 font-bold"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">📅 Fecha Límite de Entrega</Label>
              <Input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="text-xs mt-1"
              />
              {deliveryDate && (
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mt-1 block">
                  Día/Mes/Año: {formatDateDMY(deliveryDate)}
                </span>
              )}
            </div>
          </div>

          {/* Delivery Status & Payment Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">📦 Estado de la Entrega</Label>
              <Select
                value={deliveryStatus}
                onValueChange={(val: any) => setDeliveryStatus(val)}
              >
                <SelectTrigger className="text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">⏳ Pendiente de Entrega</SelectItem>
                  <SelectItem value="delivered">✅ Entregado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">💳 Estado del Pago</Label>
              <Select
                value={paymentStatus}
                onValueChange={(val: any) => setPaymentStatus(val)}
              >
                <SelectTrigger className="text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">⏳ Pendiente de Pago</SelectItem>
                  <SelectItem value="paid">✅ Pagado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payment Date & Person Responsible */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">📅 Fecha de Pago</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="text-xs mt-1"
              />
              {paymentDate && (
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mt-1 block">
                  Día/Mes/Año: {formatDateDMY(paymentDate)}
                </span>
              )}
            </div>

            <div>
              <Label className="text-xs font-semibold">👤 Persona Encargada de Entrega</Label>
              <Input
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Ej: Carlos / Carlos Jr"
                className="text-xs mt-1"
              />
            </div>
          </div>

          {/* Deliverables */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">📦 Entregables Acordados</Label>
            <div className="flex flex-wrap gap-1.5">
              {availableDeliverables.map((deliv) => {
                const isSelected = selectedDeliverables.includes(deliv);
                return (
                  <button
                    key={deliv}
                    type="button"
                    onClick={() => toggleDeliverable(deliv)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                      isSelected
                        ? "bg-indigo-500/15 border-indigo-500/50 text-indigo-700 dark:text-indigo-400 font-semibold"
                        : "bg-card border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {isSelected ? "✓ " : "+ "}
                    {deliv}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs font-semibold">📝 Notas del Acuerdo</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles sobre producto recibido, requerimientos de la marca..."
              rows={2}
              className="text-xs mt-1 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm("¿Estás seguro de eliminar este acuerdo del registro?")) {
                  deleteDealMutation.mutate();
                }
              }}
              disabled={deleteDealMutation.isPending}
              className="text-xs gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" /> Eliminar
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs"
              >
                Cancelar
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => updateDealMutation.mutate()}
                disabled={updateDealMutation.isPending || !brandName}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                {updateDealMutation.isPending ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
