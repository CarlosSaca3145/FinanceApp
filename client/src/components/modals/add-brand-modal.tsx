import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBrandSchema } from "@shared/schema";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { createBrand, apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Plus, X } from "lucide-react";

const formSchema = insertBrandSchema.extend({
  notes: z.string().optional(),
  additionalEmails: z.array(z.string().email()).optional(),
  additionalContacts: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AddBrandModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddBrandModal({ open, onOpenChange }: AddBrandModalProps) {
  const [additionalEmails, setAdditionalEmails] = useState<string[]>([]);
  const [additionalContacts, setAdditionalContacts] = useState<string[]>([]);
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
      marca: "",
      correo: "",
      nicho: "",
      contacto: "",
      campania: "",
      seguimientoModelo: "",
      notes: "",
      estado: "Pending",
      additionalEmails: [],
      additionalContacts: [],
    },
  });

  const createBrandMutation = useMutation({
    mutationFn: createBrand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Brand added successfully",
      });
      form.reset();
      setAdditionalEmails([]);
      setAdditionalContacts([]);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add brand",
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
      // Automatically select the newly added niche
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

  const addEmail = () => {
    if (newEmail && !additionalEmails.includes(newEmail)) {
      setAdditionalEmails([...additionalEmails, newEmail]);
      setNewEmail("");
    }
  };

  const removeEmail = (index: number) => {
    setAdditionalEmails(additionalEmails.filter((_, i) => i !== index));
  };

  const addContact = () => {
    if (newContact && !additionalContacts.includes(newContact)) {
      setAdditionalContacts([...additionalContacts, newContact]);
      setNewContact("");
    }
  };

  const removeContact = (index: number) => {
    setAdditionalContacts(additionalContacts.filter((_, i) => i !== index));
  };

  const handleAddNiche = () => {
    if (newNiche.trim()) {
      addNicheMutation.mutate(newNiche.trim());
    }
  };

  const onSubmit = (data: FormData) => {
    const submitData = {
      ...data,
      correos: [data.correo, ...additionalEmails].filter(Boolean),
      contactos: [data.contacto, ...additionalContacts].filter(Boolean),
    };
    createBrandMutation.mutate(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Add New Brand</DialogTitle>
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
                      disabled={addNicheMutation.isPending || !newNiche.trim()}
                      data-testid="button-save-niche"
                    >
                      {addNicheMutation.isPending ? "Adding..." : "Add"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowAddNiche(false);
                        setNewNiche("");
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
              
              <Select onValueChange={(value) => form.setValue("nicho", value)}>
                <SelectTrigger data-testid="select-niche">
                  <SelectValue placeholder="Select niche" />
                </SelectTrigger>
                <SelectContent>
                  {niches.map((niche: string) => (
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
              <Select onValueChange={(value) => form.setValue("campania", value)}>
                <SelectTrigger data-testid="select-campaign">
                  <SelectValue placeholder="Select campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign: string) => (
                    <SelectItem key={campaign} value={campaign}>
                      {campaign}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="seguimientoModelo">Follow-up Model</Label>
              <Select onValueChange={(value) => form.setValue("seguimientoModelo", value)}>
                <SelectTrigger data-testid="select-followup">
                  <SelectValue placeholder="No follow-up" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No follow-up</SelectItem>
                  <SelectItem value="1week">1 Week</SelectItem>
                  <SelectItem value="2weeks">2 Weeks</SelectItem>
                  <SelectItem value="1month">1 Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Additional Emails Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Additional Emails</Label>
              <span className="text-xs text-muted-foreground">
                Add multiple contact emails for this brand
              </span>
            </div>
            
            {additionalEmails.length > 0 && (
              <div className="mb-3 space-y-2">
                {additionalEmails.map((email, index) => (
                  <div key={index} className="flex items-center space-x-2 p-2 bg-muted rounded-lg">
                    <span className="flex-1 text-sm">{email}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeEmail(index)}
                      data-testid={`button-remove-email-${index}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
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
                onClick={addEmail}
                disabled={!newEmail}
                data-testid="button-add-email"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Additional Contacts Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Additional Contacts</Label>
              <span className="text-xs text-muted-foreground">
                Add multiple contact persons for this brand
              </span>
            </div>
            
            {additionalContacts.length > 0 && (
              <div className="mb-3 space-y-2">
                {additionalContacts.map((contact, index) => (
                  <div key={index} className="flex items-center space-x-2 p-2 bg-muted rounded-lg">
                    <span className="flex-1 text-sm">{contact}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeContact(index)}
                      data-testid={`button-remove-contact-${index}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Additional contact person"
                value={newContact}
                onChange={(e) => setNewContact(e.target.value)}
                data-testid="input-additional-contact"
              />
              <Button
                type="button"
                size="sm"
                onClick={addContact}
                disabled={!newContact}
                data-testid="button-add-contact"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...form.register("notes")}
              placeholder="Additional notes about the brand..."
              rows={3}
              data-testid="textarea-notes"
            />
          </div>
          
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createBrandMutation.isPending}
              data-testid="button-add-brand"
            >
              {createBrandMutation.isPending ? "Adding..." : "Add Brand"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
