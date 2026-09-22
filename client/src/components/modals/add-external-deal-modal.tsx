import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Briefcase, Plus } from "lucide-react";

interface AddExternalDealModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function AddExternalDealModal({ open, onOpenChange }: AddExternalDealModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [brandName, setBrandName] = useState("");
  const [dealName, setDealName] = useState("");
  const [source, setSource] = useState<string>("inbound");
  const [agreedAmount, setAgreedAmount] = useState<string>("800");
  const [deliveryDate, setDeliveryDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid">("pending");
  const [paymentDate, setPaymentDate] = useState<string>("");
  const [assignedTo, setAssignedTo] = useState("Carlos");
  const [selectedDeliverables, setSelectedDeliverables] = useState<string[]>(["Integración 60-90s"]);
  const [notes, setNotes] = useState("");

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

  const createDealMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/deals", {
        brandName,
        dealName: dealName || `Patrocinio ${brandName}`,
        source,
        agreedAmount: Number(agreedAmount) || 0,
        deliverables: selectedDeliverables,
        deliveryStatus: "pending",
        deliveryDate: deliveryDate ? deliveryDate : null,
        paymentStatus,
        paymentDate: paymentDate ? paymentDate : null,
        paymentAmount: paymentStatus === "paid" ? Number(agreedAmount) || 0 : 0,
        assignedTo: assignedTo || null,
        notes: notes || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/summary"] });
      toast({
        title: "✅ Patrocinio Registrado",
        description: `Se ha agregado el patrocinio de "${brandName}" al departamento.`,
      });
      onOpenChange(false);
      setBrandName("");
      setDealName("");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Error al registrar patrocinio", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Registrar Patrocinio Externo</DialogTitle>
              <DialogDescription className="text-xs">
                Registra patrocinios recibidos por correo directo, agencia o recomendación
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Brand Name & Deal Title */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">🏢 Patrocinador / Marca</Label>
              <Input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Ej: Samsung, Sony, Keychron"
                className="text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">📍 Canal / Origen</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbound">📥 Email Entrante (Inbound)</SelectItem>
                  <SelectItem value="agency">🏢 Agencia de Publicidad</SelectItem>
                  <SelectItem value="referral">🤝 Recomendación / Networking</SelectItem>
                  <SelectItem value="other">📌 Otro Canal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Deal Name */}
          <div>
            <Label className="text-xs font-semibold">🏷️ Nombre o Concepto del Acuerdo</Label>
            <Input
              value={dealName}
              onChange={(e) => setDealName(e.target.value)}
              placeholder="Ej: Lanzamiento Galaxy S26 - Integración YouTube"
              className="text-xs mt-1"
            />
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
                  placeholder="800"
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

          {/* Payment Status & Date */}
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
              {paymentDate && (
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mt-1 block">
                  Día/Mes/Año: {formatDateDMY(paymentDate)}
                </span>
              )}
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

          {/* Deliverables */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">📦 Entregables Acordados</Label>
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
                        ? "bg-indigo-500/15 border-indigo-500/50 text-indigo-700 dark:text-indigo-400 font-semibold"
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
            <Label className="text-xs font-semibold">📝 Notas del Acuerdo</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles del acuerdo, persona de contacto en la marca..."
              className="text-xs min-h-[60px] mt-1"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => createDealMutation.mutate()}
            disabled={createDealMutation.isPending || !brandName}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs gap-1.5"
          >
            <Plus className="h-4 w-4" />
            {createDealMutation.isPending ? "Guardando..." : "Registrar en el Departamento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
