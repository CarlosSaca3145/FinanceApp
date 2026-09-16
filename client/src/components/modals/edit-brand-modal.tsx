import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { insertBrandSchema } from "@shared/schema";
import { updateBrand, apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Brand } from "@shared/schema";

const formSchema = insertBrandSchema.extend({
  notes: z.string().optional(),
  additionalEmails: z.array(z.string().email()).optional(),
  additionalContacts: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EditBrandModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand: Brand;
}

export function EditBrandModal({ open, onOpenChange, brand }: EditBrandModalProps) {
  const [additionalEmails, setAdditionalEmails] = useState<string[]>(
    brand.correos?.filter(email => email !== brand.correo) || []
  );
  const [additionalContacts, setAdditionalContacts] = useState<string[]>(
    brand.contactos?.filter(contact => contact !== brand.contacto) || []
  );
  const [newEmail, setNewEmail] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newNiche, setNewNiche] = useState("");
  const [showAddNiche, setShowAddNiche] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load niches and campaigns
  const { data: niches = [] } = useQuery<string[]>({
    queryKey: ["/api/brands/niches"],
  });

  const { data: campaigns = [] } = useQuery<string[]>({
    queryKey: ["/api/brands/campaigns"],
  });
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      marca: brand.marca || "",
      correo: brand.correo || "",
      nicho: brand.nicho || "",
      contacto: brand.contacto || "",
      campania: brand.campania || "",
      seguimientoModelo: brand.seguimientoModelo || "",
      notes: brand.notes || "",
      estado: brand.estado || "Pending",
      additionalEmails: [],
      additionalContacts: [],
    },
  });

  const updateBrandMutation = useMutation({
    mutationFn: (data: any) => updateBrand(brand.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Brand updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update brand",
        variant: "destructive",
      });
    },
  });

  const addNicheMutation = useMutation({
    mutationFn: async (nicho: string) => {
      const response = await apiRequest("POST", "/api/brands/niches", { nicho });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands/niches"] });
      form.setValue("nicho", data.nicho);
      toast({
        title: "Success",
        description: "New niche added successfully",
      });
      setNewNiche("");
      setShowAddNiche(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add niche",
        variant: "destructive",
      });
    },
  });

  const handleAddNiche = () => {
    if (newNiche.trim()) {
      addNicheMutation.mutate(newNiche.trim());
    }
  };

  const handleAddEmail = () => {
    if (newEmail && !additionalEmails.includes(newEmail)) {
      setAdditionalEmails([...additionalEmails, newEmail]);
      setNewEmail("");
    }
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setAdditionalEmails(additionalEmails.filter(email => email !== emailToRemove));
  };

  const handleAddContact = () => {
    if (newContact && !additionalContacts.includes(newContact)) {
      setAdditionalContacts([...additionalContacts, newContact]);
      setNewContact("");
    }
  };

  const handleRemoveContact = (contactToRemove: string) => {
    setAdditionalContacts(additionalContacts.filter(contact => contact !== contactToRemove));
  };

  const onSubmit = (data: FormData) => {
    const submitData = {
      ...data,
      correos: [data.correo, ...additionalEmails].filter(Boolean),
      contactos: [data.contacto, ...additionalContacts].filter(Boolean),
    };
    updateBrandMutation.mutate(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Brand</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="marca">Brand Name</Label>
              <Input
                id="marca"
                {...form.register("marca")}
                placeholder="Enter brand name"
                data-testid="input-brand-name"
              />
              {form.formState.errors.marca && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.marca.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="contacto">Contact Person</Label>
              <Input
                id="contacto"
                {...form.register("contacto")}
                placeholder="Contact name"
                data-testid="input-contact-name"
              />
            </div>
            
            <div>
              <Label htmlFor="correo">Email Address</Label>
              <Input
                id="correo"
                type="email"
                {...form.register("correo")}
                placeholder="contact@brand.com"
                data-testid="input-email"
              />
              {form.formState.errors.correo && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.correo.message}</p>
              )}
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="nicho">Niche</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddNiche(!showAddNiche)}
                  className="flex items-center space-x-1"
                  data-testid="button-add-niche"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add New</span>
                </Button>
              </div>
              
              {showAddNiche && (
                <div className="mb-3 p-3 border border-dashed border-border rounded-lg bg-muted/50">
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="Enter new niche name"
                      value={newNiche}
                      onChange={(e) => setNewNiche(e.target.value)}
                      data-testid="input-new-niche"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddNiche}
                      disabled={!newNiche.trim() || addNicheMutation.isPending}
                      data-testid="button-save-niche"
                    >
                      {addNicheMutation.isPending ? "Adding..." : "Add"}
                    </Button>
                  </div>
                </div>
              )}
              
              <Select onValueChange={(value) => form.setValue("nicho", value)} value={form.watch("nicho")}>
                <SelectTrigger data-testid="select-niche">
                  <SelectValue placeholder="Select a niche" />
                </SelectTrigger>
                <SelectContent>
                  {niches.map((niche) => (
                    <SelectItem key={niche} value={niche}>
                      {niche}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.nicho && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.nicho.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="campania">Campaign</Label>
              <Select onValueChange={(value) => form.setValue("campania", value)} value={form.watch("campania") || undefined}>
                <SelectTrigger data-testid="select-campaign">
                  <SelectValue placeholder="Select a campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign} value={campaign}>
                      {campaign}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="estado">Status</Label>
              <Select onValueChange={(value) => form.setValue("estado", value)} value={form.watch("estado") || undefined}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Sent">Sent</SelectItem>
                  <SelectItem value="Responded">Responded</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                  <SelectItem value="Agreed">Agreed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Additional Emails Section */}
          <div>
            <Label>Additional Email Addresses</Label>
            <div className="mt-2 space-y-3">
              {additionalEmails.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {additionalEmails.map((email, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {email}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-auto p-0 hover:bg-transparent"
                        onClick={() => handleRemoveEmail(email)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Input
                  type="email"
                  placeholder="Additional email address"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  data-testid="input-additional-email"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddEmail}
                  disabled={!newEmail}
                  data-testid="button-add-email"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Additional Contacts Section */}
          <div>
            <Label>Additional Contacts</Label>
            <div className="mt-2 space-y-3">
              {additionalContacts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {additionalContacts.map((contact, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {contact}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-auto p-0 hover:bg-transparent"
                        onClick={() => handleRemoveContact(contact)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Additional contact name"
                  value={newContact}
                  onChange={(e) => setNewContact(e.target.value)}
                  data-testid="input-additional-contact"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddContact}
                  disabled={!newContact}
                  data-testid="button-add-contact"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...form.register("notes")}
              placeholder="Additional notes about this brand..."
              rows={3}
              data-testid="input-notes"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateBrandMutation.isPending}
              data-testid="button-save"
            >
              {updateBrandMutation.isPending ? "Updating..." : "Update Brand"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}