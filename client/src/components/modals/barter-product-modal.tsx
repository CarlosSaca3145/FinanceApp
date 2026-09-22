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
import { Package, DollarSign, Tag } from "lucide-react";

interface BarterProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: {
    id: string;
    productName: string;
    brandName: string;
    commercialValue: number;
    soldPrice: number;
    saleStatus: "in_stock" | "sold";
    notes?: string | null;
  } | null;
}

export function BarterProductModal({ open, onOpenChange, product }: BarterProductModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [brandName, setBrandName] = useState(product?.brandName || "");
  const [productName, setProductName] = useState(product?.productName || "");
  const [commercialValue, setCommercialValue] = useState<string>(product?.commercialValue?.toString() || "300");
  const [soldPrice, setSoldPrice] = useState<string>(product?.soldPrice?.toString() || "0");
  const [saleStatus, setSaleStatus] = useState<"in_stock" | "sold">(product?.saleStatus || "in_stock");
  const [notes, setNotes] = useState(product?.notes || "");

  const saveProductMutation = useMutation({
    mutationFn: async () => {
      if (product?.id) {
        const res = await apiRequest("PUT", `/api/barter-products/${product.id}`, {
          brandName,
          productName,
          commercialValue: Number(commercialValue) || 0,
          soldPrice: Number(soldPrice) || 0,
          saleStatus,
          soldDate: saleStatus === "sold" ? new Date() : null,
          notes,
        });
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/barter-products", {
          brandName,
          productName,
          commercialValue: Number(commercialValue) || 0,
          soldPrice: Number(soldPrice) || 0,
          saleStatus,
          soldDate: saleStatus === "sold" ? new Date() : null,
          notes,
        });
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/barter-products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/summary"] });
      toast({
        title: "📦 Producto Registrado",
        description: `Producto de canje "${productName}" guardado correctamente.`,
      });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Error al guardar producto", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                {product ? "Editar Producto en Canje" : "Registrar Producto Recibido por Canje"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Lleva un registro de los productos comerciales recibidos y su precio de venta posterior
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Brand & Product Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">🏢 Marca / Patrocinador</Label>
              <Input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Ej: Logitech, Sony"
                className="text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">📦 Nombre del Producto</Label>
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Ej: Teclado MX Keys S"
                className="text-xs mt-1"
              />
            </div>
          </div>

          {/* Commercial Value (MSRP) vs Sold Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">🏷️ Valor Comercial MSRP ($)</Label>
              <div className="relative mt-1">
                <DollarSign className="h-3.5 w-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  type="number"
                  value={commercialValue}
                  onChange={(e) => setCommercialValue(e.target.value)}
                  placeholder="200"
                  className="text-xs pl-8 font-bold"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Precio oficial de mercado</p>
            </div>

            <div>
              <Label className="text-xs font-semibold">💵 Precio de Venta Real ($)</Label>
              <div className="relative mt-1">
                <DollarSign className="h-3.5 w-3.5 absolute left-3 top-2.5 text-emerald-600 font-bold" />
                <Input
                  type="number"
                  value={soldPrice}
                  onChange={(e) => setSoldPrice(e.target.value)}
                  placeholder="150"
                  className="text-xs pl-8 font-bold text-emerald-600 dark:text-emerald-400"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Monto en que se vendió</p>
            </div>
          </div>

          {/* Sale Status */}
          <div>
            <Label className="text-xs font-semibold">📍 Estado del Producto</Label>
            <Select value={saleStatus} onValueChange={(val: any) => setSaleStatus(val)}>
              <SelectTrigger className="text-xs mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_stock">📦 En Inventario (Sin vender)</SelectItem>
                <SelectItem value="sold">✅ Vendido (Dinero recibido)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs font-semibold">📝 Notas / Estado físico del producto</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Estado de la caja, comprador, fecha de recepción..."
              className="text-xs min-h-[60px] mt-1"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => saveProductMutation.mutate()}
            disabled={saveProductMutation.isPending || !productName || !brandName}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs gap-1.5"
          >
            {saveProductMutation.isPending ? "Guardando..." : "Guardar Producto en Canje"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
