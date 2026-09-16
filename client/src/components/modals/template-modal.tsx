import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertContentTemplateSchema } from "@shared/schema";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { createContentTemplate, updateContentTemplate, apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Wand2 } from "lucide-react";
import type { ContentTemplate } from "@shared/schema";

type FormData = z.infer<typeof insertContentTemplateSchema>;

interface TemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: ContentTemplate | null;
}

export function TemplateModal({ open, onOpenChange, template }: TemplateModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!template;
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  const form = useForm<FormData>({
    resolver: zodResolver(insertContentTemplateSchema),
    defaultValues: {
      nicho: template?.nicho || "",
      contenido: template?.contenido || "",
    },
  });

  const { data: niches = [] } = useQuery<string[]>({
    queryKey: ["/api/brands/niches"],
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      form.reset({
        nicho: template?.nicho || "",
        contenido: template?.contenido || "",
      });
    }
  }, [template, open, form]);

  const createMutation = useMutation({
    mutationFn: createContentTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-templates"] });
      toast({
        title: "Success",
        description: "Template created successfully",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create template",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ContentTemplate> }) =>
      updateContentTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-templates"] });
      toast({
        title: "Success",
        description: "Template updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update template",
        variant: "destructive",
      });
    },
  });

  const generateAIContent = async () => {
    const nicho = form.getValues("nicho");
    if (!nicho) {
      toast({
        title: "Error",
        description: "Please select a niche first",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingAI(true);
    try {
      const response = await apiRequest("POST", "/api/ai/generate-email", {
        brandName: "Sample Brand",
        industry: nicho,
        tone: "professional",
        purpose: "outreach",
        additionalContext: `Generate content template for ${nicho} niche outreach emails`
      });

      const data = await response.json();
      form.setValue("contenido", data.content);
      toast({
        title: "Success",
        description: "AI content generated successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate AI content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const improveContent = async () => {
    const currentContent = form.getValues("contenido");
    if (!currentContent) {
      toast({
        title: "Error",
        description: "Please add some content first",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingAI(true);
    try {
      const response = await apiRequest("POST", "/api/ai/improve-template", {
        currentContent,
        improvements: "Make it more engaging and professional while maintaining the original intent"
      });

      const data = await response.json();
      form.setValue("contenido", data.improvedContent);
      toast({
        title: "Success",
        description: "Content improved with AI!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to improve content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const onSubmit = (data: FormData) => {
    if (isEditing && template) {
      updateMutation.mutate({ id: template.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Template" : "Add Content Template"}</DialogTitle>
          <DialogDescription>
            Create email templates for different niches with AI assistance
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="nicho">Niche</Label>
            <Input
              id="nicho"
              list="niches-datalist"
              {...form.register("nicho")}
              placeholder="Select or type a niche..."
              data-testid="input-template-niche"
            />
            <datalist id="niches-datalist">
              {niches.map((n: string) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            {form.formState.errors.nicho && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.nicho.message}</p>
            )}
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="contenido">Content Template</Label>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={generateAIContent}
                  disabled={isGeneratingAI}
                  className="text-xs"
                  data-testid="button-generate-ai-content"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  {isGeneratingAI ? "Generating..." : "Generate with AI"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={improveContent}
                  disabled={isGeneratingAI}
                  className="text-xs"
                  data-testid="button-improve-content"
                >
                  <Wand2 className="h-3 w-3 mr-1" />
                  Improve with AI
                </Button>
              </div>
            </div>
            <Textarea
              id="contenido"
              {...form.register("contenido")}
              placeholder="Enter the content template for this niche... or use AI to generate it!"
              rows={8}
              data-testid="textarea-template-content"
            />
            {form.formState.errors.contenido && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.contenido.message}</p>
            )}
          </div>
          
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-template"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-template"
            >
              {(createMutation.isPending || updateMutation.isPending) 
                ? "Saving..." 
                : isEditing ? "Update Template" : "Add Template"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
