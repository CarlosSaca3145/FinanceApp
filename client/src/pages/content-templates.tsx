import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Plus, Link, Lightbulb, Eye, Video, Copy, ExternalLink, Search, X, Sparkles, Trash2, Edit, Download, Upload } from "lucide-react";
import { TemplateModal } from "@/components/modals/template-modal";
import { getContentTemplates, getFollowupTemplates, deleteContentTemplate } from "@/lib/api";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { exportContentTemplatesToExcel, importContentTemplatesFromExcel } from "@/lib/excel-utils";
import type { ContentTemplate, FollowupTemplate } from "@shared/schema";

interface VideoData {
  link: string;
  title: string;
  ideas: string[];
  views?: string;
}

interface NicheLinks {
  [niche: string]: VideoData[];
}

interface NicheIdeas {
  [niche: string]: string[];
}

export function ContentTemplates() {
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNiche, setSelectedNiche] = useState("");
  const [newVideoLink, setNewVideoLink] = useState("");
  const [newVideoIdea, setNewVideoIdea] = useState("");
  const [newVideoViews, setNewVideoViews] = useState("");
  const [newIdea, setNewIdea] = useState("");
  const [showAddLinkDialog, setShowAddLinkDialog] = useState(false);
  const [showAddIdeaDialog, setShowAddIdeaDialog] = useState(false);
  const [editingIdea, setEditingIdea] = useState<{niche: string, index: number, idea: string} | null>(null);
  const [editIdeaText, setEditIdeaText] = useState("");
  const [showAddFollowupDialog, setShowAddFollowupDialog] = useState(false);
  const [showGenerateFollowupDialog, setShowGenerateFollowupDialog] = useState(false);
  const [newFollowupName, setNewFollowupName] = useState("");
  const [newFollowupTemplate, setNewFollowupTemplate] = useState("");
  const [generateFollowupPrompt, setGenerateFollowupPrompt] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contentTemplates = [], isLoading: isLoadingContent } = useQuery({
    queryKey: ["/api/content-templates"],
    queryFn: () => import("@/lib/api").then(m => m.getContentTemplatesTyped()),
  });

  const { data: followupTemplates = [], isLoading: isLoadingFollowup } = useQuery({
    queryKey: ["/api/followup-templates"],
    queryFn: () => import("@/lib/api").then(m => m.getFollowupTemplatesTyped()),
  });

  const { data: niches = [] } = useQuery({
    queryKey: ["/api/brands/niches"],
    select: (data: any) => data || [],
  });

  const updateTemplateMutation = useMutation({
    mutationFn: (data: { id: string; update: Partial<ContentTemplate> }) =>
      apiRequest("PATCH", `/api/content-templates/${data.id}`, data.update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-templates"] });
      toast({
        title: "Success",
        description: "Template updated successfully",
      });
      setNewVideoLink("");
      setNewVideoIdea("");
      setNewVideoViews("");
      setNewIdea("");
      setShowAddLinkDialog(false);
      setShowAddIdeaDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update template",
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: deleteContentTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-templates"] });
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete template",
        variant: "destructive",
      });
    },
  });

  const createFollowupMutation = useMutation({
    mutationFn: (data: { name: string; template: string }) =>
      apiRequest("POST", "/api/followup-templates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/followup-templates"] });
      toast({
        title: "Success",
        description: "Follow-up template created successfully",
      });
      setNewFollowupName("");
      setNewFollowupTemplate("");
      setShowAddFollowupDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create follow-up template",
        variant: "destructive",
      });
    },
  });

  const generateFollowupMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const response = await apiRequest("POST", "/api/generate-followup", { prompt });
      return response.json();
    },
    onSuccess: (data: { followup: string }) => {
      setNewFollowupTemplate(data.followup);
      setShowGenerateFollowupDialog(false);
      setShowAddFollowupDialog(true);
      toast({
        title: "Success",
        description: "Follow-up generated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate follow-up",
        variant: "destructive",
      });
    },
  });

  const generateIdeaMutation = useMutation({
    mutationFn: async (data: { niche: string; prompt: string }) => {
      const response = await apiRequest("POST", "/api/generate-idea", data);
      return response.json();
    },
    onSuccess: (data: { idea: string }) => {
      setNewIdea(data.idea);
      toast({
        title: "Success",
        description: "Idea enhanced with AI successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate idea",
        variant: "destructive",
      });
    },
  });

  // Organize data by niche
  const nicheLinks: NicheLinks = {};
  const nicheIdeas: NicheIdeas = {};
  const nicheViews: { [niche: string]: string } = {};

  contentTemplates.forEach((template: ContentTemplate) => {
    const niche = template.nicho;
    
    // Organize links with titles and extract all ideas for links section
    if (template.videoLinks && template.videoLinks.length > 0) {
      if (!nicheLinks[niche]) nicheLinks[niche] = [];
      
      template.videoLinks.forEach((link, index) => {
        const title = template.videoTitles && template.videoTitles[index] 
          ? template.videoTitles[index] 
          : `${niche} Review - Product Demonstration`;
        
        // Get the specific idea for this video link
        const extractedIdeas: string[] = [];
        
        // First try to get the specific idea from videoIdeas array
        if (template.videoIdeas && template.videoIdeas[index]) {
          extractedIdeas.push(template.videoIdeas[index]);
        } else {
          // Fallback to general ideas if no specific idea exists
          if (template.originalIdea) extractedIdeas.push(template.originalIdea);
          if (template.proposedIdea) extractedIdeas.push(template.proposedIdea);
          if (template.idea) {
            const ideas = template.idea.split('\n').filter(idea => idea.trim());
            extractedIdeas.push(...ideas.map(idea => idea.replace(/^•\s*/, '')));
          }
        }
        
        // Get the specific views for this video link
        const videoViews = template.videoViews && template.videoViews[index] 
          ? template.videoViews[index] 
          : undefined;
        
        nicheLinks[niche].push({
          link,
          title,
          ideas: extractedIdeas,
          views: videoViews
        });
      });
    }
    
    // Extract concise content ideas only
    if (template.nicho) {
      if (!nicheIdeas[niche]) nicheIdeas[niche] = [];
      
      
      // Extract ideas from multiple sources
      if (template.idea) {
        const ideaLines = template.idea.split('\n').filter(line => line.trim());
        ideaLines.forEach((line, index) => {
          const cleanLine = line.replace(/^•\s*/, '').trim();
          
          
          // Extract formatted ideas with the standard pattern
          const ideaMatch = cleanLine.match(/In order to achieve good reach with your product, I propose the following content idea:\s*["']?([^"'\n]+)["']?/i);
          if (ideaMatch) {
            const extractedIdea = ideaMatch[1].trim();
            if (extractedIdea && !nicheIdeas[niche].includes(extractedIdea)) {
              nicheIdeas[niche].push(extractedIdea);
            }
          }
          // Handle complex lines that might contain ideas within them
          else if (cleanLine.includes('In order to achieve good reach') && cleanLine.includes('content idea:')) {
            const complexMatch = cleanLine.match(/content idea:\s*["']?([^"'\n]+?)["']?$/i);
            if (complexMatch) {
              const extractedIdea = complexMatch[1].trim();
              if (extractedIdea && !nicheIdeas[niche].includes(extractedIdea)) {
                nicheIdeas[niche].push(extractedIdea);
              }
            }
          }
          // Also extract simple short ideas that don't follow the format
          else if (cleanLine && 
                   cleanLine.length < 150 && 
                   !cleanLine.includes('In order to achieve') &&
                   !cleanLine.includes('I want to show you') &&
                   !cleanLine.includes('according to the link') &&
                   !cleanLine.includes('showing how') &&
                   !nicheIdeas[niche].includes(cleanLine)) {
            // Only add if it looks like a genuine idea (not metadata or explanatory text)
            if (!cleanLine.includes('http') && !cleanLine.includes('It is just one of')) {
              nicheIdeas[niche].push(cleanLine);
            }
          }
        });
      }
      
      // Also check for concise ideas from originalIdea and proposedIdea if they are short
      const potentialIdeas = [template.originalIdea, template.proposedIdea].filter(Boolean);
      potentialIdeas.forEach(idea => {
        if (idea && idea.length < 150 && !idea.includes('In order to achieve') && !nicheIdeas[niche].includes(idea)) {
          nicheIdeas[niche].push(idea);
        }
      });
      
    }
    
    // Store views info
    if (template.views) {
      nicheViews[niche] = template.views;
    }
  });

  const filteredNiches = Object.keys(nicheLinks).filter(niche =>
    !searchQuery || niche.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTemplate = (niche: string) => {
    return contentTemplates.find((t: ContentTemplate) => t.nicho === niche);
  };

  const handleAddVideoLink = () => {
    if (!selectedNiche || !newVideoLink.trim() || !newVideoIdea.trim()) return;
    
    const template = getTemplate(selectedNiche);
    if (!template) return;
    
    const currentLinks = template.videoLinks || [];
    const updatedLinks = [...currentLinks, newVideoLink.trim()];
    
    const currentIdeas = template.videoIdeas || [];
    const updatedIdeas = [...currentIdeas, newVideoIdea.trim()];
    
    const currentViews = template.videoViews || [];
    const updatedViews = [...currentViews, newVideoViews.trim() || ""];
    
    updateTemplateMutation.mutate({
      id: template.id,
      update: { 
        videoLinks: updatedLinks,
        videoIdeas: updatedIdeas,
        videoViews: updatedViews
      }
    });
  };

  const handleDeleteVideoLink = (niche: string, linkIndex: number) => {
    const template = getTemplate(niche);
    if (!template) return;
    
    const currentLinks = template.videoLinks || [];
    const updatedLinks = currentLinks.filter((_, index) => index !== linkIndex);
    
    const currentIdeas = template.videoIdeas || [];
    const updatedIdeas = currentIdeas.filter((_, index) => index !== linkIndex);
    
    const currentViews = template.videoViews || [];
    const updatedViews = currentViews.filter((_, index) => index !== linkIndex);
    
    updateTemplateMutation.mutate({
      id: template.id,
      update: { 
        videoLinks: updatedLinks,
        videoIdeas: updatedIdeas,
        videoViews: updatedViews
      }
    });
  };

  const handleAddIdea = () => {
    if (!selectedNiche || !newIdea.trim()) return;
    
    const template = getTemplate(selectedNiche);
    if (!template) return;
    
    // Format the new idea as a concise content idea
    const formattedIdea = `In order to achieve good reach with your product, I propose the following content idea: "${newIdea.trim()}"`;
    
    const currentIdea = template.idea || "";
    const updatedIdea = currentIdea 
      ? `${currentIdea}\n• ${formattedIdea}`
      : `• ${formattedIdea}`;
    
    updateTemplateMutation.mutate({
      id: template.id,
      update: { idea: updatedIdea }
    });
    
    // Reset form
    setNewIdea('');
    setShowAddIdeaDialog(false);
  };

  const handleDeleteIdea = (niche: string, ideaIndex: number) => {
    const template = getTemplate(niche);
    if (!template) return;
    
    // Get current idea lines
    const currentIdea = template.idea || "";
    const ideaLines = currentIdea.split('\n').filter(line => line.trim());
    
    // Build a list of concise idea line indices
    const conciseIdeaIndices: number[] = [];
    ideaLines.forEach((line, index) => {
      const cleanLine = line.replace(/^•\s*/, '').trim();
      const ideaMatch = cleanLine.match(/In order to achieve good reach with your product, I propose the following content idea:/i);
      if (ideaMatch) {
        conciseIdeaIndices.push(index);
      }
    });
    
    // Remove the line at the specific concise idea index
    if (ideaIndex < conciseIdeaIndices.length) {
      const lineIndexToRemove = conciseIdeaIndices[ideaIndex];
      const updatedIdeaLines = ideaLines.filter((_, index) => index !== lineIndexToRemove);
      const updatedIdea = updatedIdeaLines.join('\n');
      
      updateTemplateMutation.mutate({
        id: template.id,
        update: { idea: updatedIdea }
      });
    }
  };

  const handleEditIdea = () => {
    if (!editingIdea || !editIdeaText.trim()) return;

    const template = getTemplate(editingIdea.niche);
    if (!template) return;
    
    // Get current idea lines
    const currentIdea = template.idea || "";
    const ideaLines = currentIdea.split('\n').filter(line => line.trim());
    
    // Build a list of concise idea line indices  
    const conciseIdeaIndices: number[] = [];
    ideaLines.forEach((line, index) => {
      const cleanLine = line.replace(/^•\s*/, '').trim();
      const ideaMatch = cleanLine.match(/In order to achieve good reach with your product, I propose the following content idea:/i);
      if (ideaMatch) {
        conciseIdeaIndices.push(index);
      }
    });
    
    // Replace the line at the specific concise idea index
    if (editingIdea.index < conciseIdeaIndices.length) {
      const lineIndexToReplace = conciseIdeaIndices[editingIdea.index];
      const formattedNewIdea = `In order to achieve good reach with your product, I propose the following content idea: "${editIdeaText.trim()}"`;
      ideaLines[lineIndexToReplace] = `• ${formattedNewIdea}`;
      
      const updatedIdea = ideaLines.join('\n');
      
      updateTemplateMutation.mutate({
        id: template.id,
        update: { idea: updatedIdea }
      });
      
      // Reset editing state
      setEditingIdea(null);
      setEditIdeaText("");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Content copied to clipboard",
    });
  };

  const formatViews = (views: string | null) => {
    if (!views) return null;
    return views.replace(/(\d+)([kmb])/gi, '$1$2').toUpperCase();
  };

  const handleEditTemplate = (template: ContentTemplate) => {
    setSelectedTemplate(template);
    setShowTemplateModal(true);
  };

  const handleDeleteTemplate = (template: ContentTemplate) => {
    if (confirm(`Are you sure you want to delete the ${template.nicho} template?`)) {
      deleteTemplateMutation.mutate(template.id);
    }
  };

  const handleAddTemplate = () => {
    setSelectedTemplate(null);
    setShowTemplateModal(true);
  };

  const handleExportTemplates = () => {
    try {
      const filename = exportContentTemplatesToExcel(contentTemplates);
      toast({
        title: "Success",
        description: `Content templates exported to ${filename}`,
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to export content templates",
        variant: "destructive",
      });
    }
  };

  const handleImportTemplates = async (file: File) => {
    try {
      const { videoLinks, ideas } = await importContentTemplatesFromExcel(file);
      
      console.log("Importing:", { videoLinks: videoLinks.length, ideas: ideas.length });
      
      // Send data to server endpoint
      const response = await apiRequest('POST', '/api/content-templates/import-excel', { videoLinks, ideas });
      const result = await response.json();
      
      console.log("Import response:", result);
      
      // Refresh the templates data
      queryClient.invalidateQueries({ queryKey: ['/api/content-templates'] });
      
      toast({
        title: "Success",
        description: `Imported successfully: ${result.totalVideoLinks} video links, ${result.totalIdeas} ideas across ${result.total} niches. Updated: ${result.updated}, Created: ${result.created}`,
      });
      setShowImportModal(false);
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Error",
        description: "Failed to import content templates",
        variant: "destructive",
      });
    }
  };

  const handleAddNiche = async () => {
    const nicheName = prompt("Enter the name of the new niche:");
    if (!nicheName || !nicheName.trim()) return;
    
    try {
      const response = await apiRequest("POST", "/api/brands/niches", {
        nicho: nicheName.trim(),
      });
      
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/content-templates"] });
        queryClient.invalidateQueries({ queryKey: ["/api/brands/niches"] });
        toast({
          title: "Success",
          description: `Niche "${nicheName.trim()}" created successfully`,
        });
      } else {
        const err = await response.json();
        throw new Error(err.error || "Failed to create niche");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create niche",
        variant: "destructive",
      });
    }
  };

  const handleRenameNiche = async (oldNicheName: string) => {
    const newNicheName = prompt(`Rename niche "${oldNicheName}" to:`, oldNicheName);
    if (!newNicheName || !newNicheName.trim() || newNicheName.trim() === oldNicheName) return;
    
    try {
      const response = await apiRequest("PUT", "/api/brands/niches", {
        oldNiche: oldNicheName,
        newNiche: newNicheName.trim(),
      });
      
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/content-templates"] });
        queryClient.invalidateQueries({ queryKey: ["/api/brands/niches"] });
        queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
        toast({
          title: "Success",
          description: `Niche renamed to ${newNicheName.trim()}`,
        });
      } else {
        const err = await response.json();
        throw new Error(err.error || "Failed to rename niche");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to rename niche",
        variant: "destructive",
      });
    }
  };

  const handleAddFollowup = () => {
    if (!newFollowupName.trim() || !newFollowupTemplate.trim()) return;
    
    createFollowupMutation.mutate({
      name: newFollowupName.trim(),
      template: newFollowupTemplate.trim()
    });
  };

  const handleGenerateFollowup = () => {
    if (!generateFollowupPrompt.trim()) {
      toast({
        title: "Error",
        description: "Please provide a prompt for the AI generation",
        variant: "destructive",
      });
      return;
    }
    
    generateFollowupMutation.mutate(generateFollowupPrompt.trim());
  };

  const handleGenerateIdea = () => {
    if (!newIdea.trim()) {
      toast({
        title: "Error",
        description: "Please write some content first, then AI can enhance it",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedNiche) {
      toast({
        title: "Error",
        description: "Please select a niche first",
        variant: "destructive",
      });
      return;
    }
    
    generateIdeaMutation.mutate({
      niche: selectedNiche,
      prompt: newIdea.trim()
    });
  };

  if (isLoadingContent || isLoadingFollowup) {
    return (
      <div className="flex-1 overflow-auto">
        <header className="bg-card border-b border-border px-8 py-6">
          <h2 className="text-2xl font-bold text-foreground">Content Templates</h2>
          <p className="text-muted-foreground">Manage links and ideas organized by niche</p>
        </header>
        <div className="p-8">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-32 bg-muted rounded"></div>
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
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-foreground">Content Templates</h2>
            <p className="text-sm lg:text-base text-muted-foreground">Manage links and ideas organized by niche</p>
          </div>
          
          {/* Desktop buttons */}
          <div className="hidden lg:flex items-center space-x-3">
            <Button 
              variant="outline"
              onClick={handleExportTemplates}
              className="flex items-center space-x-2"
              data-testid="button-export-templates"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </Button>
            <Button 
              variant="secondary"
              onClick={() => setShowImportModal(true)}
              className="flex items-center space-x-2"
              data-testid="button-import-templates"
            >
              <Upload className="h-4 w-4" />
              <span>Import</span>
            </Button>
            <Button 
              onClick={handleAddNiche}
              variant="outline"
              className="flex items-center space-x-2 border-dashed border-blue-500 text-blue-600 hover:text-blue-700 hover:bg-blue-50/50"
              data-testid="button-add-niche"
            >
              <Plus className="h-4 w-4" />
              <span>Add Niche</span>
            </Button>
            <Button 
              onClick={handleAddTemplate}
              className="flex items-center space-x-2"
              data-testid="button-add-template"
            >
              <Plus className="h-4 w-4" />
              <span>Add Template</span>
            </Button>
          </div>
          
          {/* Mobile buttons */}
          <div className="lg:hidden grid grid-cols-4 gap-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={handleExportTemplates}
              className="flex items-center justify-center space-x-1"
              data-testid="button-export-templates-mobile"
            >
              <Download className="h-4 w-4" />
              <span className="text-xs">Export</span>
            </Button>
            <Button 
              variant="secondary"
              size="sm"
              onClick={() => setShowImportModal(true)}
              className="flex items-center justify-center space-x-1"
              data-testid="button-import-templates-mobile"
            >
              <Upload className="h-4 w-4" />
              <span className="text-xs">Import</span>
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={handleAddNiche}
              className="flex items-center justify-center space-x-1 border-dashed border-blue-500 text-blue-600 hover:text-blue-700"
              data-testid="button-add-niche-mobile"
            >
              <Plus className="h-4 w-4" />
              <span className="text-xs">Niche</span>
            </Button>
            <Button 
              size="sm"
              onClick={handleAddTemplate}
              className="flex items-center justify-center space-x-1"
              data-testid="button-add-template-mobile"
            >
              <Plus className="h-4 w-4" />
              <span className="text-xs">Add</span>
            </Button>
          </div>
        </div>
        
        {/* Search */}
        <div className="mt-4 lg:mt-6 flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by niche..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-niches"
            />
          </div>
          {searchQuery && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="flex items-center space-x-1"
            >
              <X className="h-3 w-3" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          )}
        </div>
      </header>

      <div className="p-4 lg:p-8">
        <Tabs defaultValue="links" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="links" className="flex items-center justify-center space-x-1 lg:space-x-2 text-xs lg:text-sm">
              <Link className="h-3 w-3 lg:h-4 lg:w-4" />
              <span className="hidden sm:inline">Links by Niche</span>
              <span className="sm:hidden">Links</span>
            </TabsTrigger>
            <TabsTrigger value="ideas" className="flex items-center justify-center space-x-1 lg:space-x-2 text-xs lg:text-sm">
              <Lightbulb className="h-3 w-3 lg:h-4 lg:w-4" />
              <span className="hidden sm:inline">Ideas by Niche</span>
              <span className="sm:hidden">Ideas</span>
            </TabsTrigger>
            <TabsTrigger value="followups" className="flex items-center justify-center space-x-1 lg:space-x-2 text-xs lg:text-sm">
              <span className="hidden sm:inline">Follow-ups</span>
              <span className="sm:hidden">Follow</span>
            </TabsTrigger>
          </TabsList>

          {/* Links Tab */}
          <TabsContent value="links" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Video Links by Niche</h3>
              <Dialog open={showAddLinkDialog} onOpenChange={setShowAddLinkDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>Add Link</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Video Link</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Select Niche</label>
                      <Select value={selectedNiche} onValueChange={setSelectedNiche}>
                        <SelectTrigger data-testid="select-niche-for-link">
                          <SelectValue placeholder="Choose a niche" />
                        </SelectTrigger>
                        <SelectContent>
                          {niches.map((niche: string) => (
                            <SelectItem key={niche} value={niche}>
                              {niche}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Content Idea</label>
                      <Textarea
                        placeholder="Describe the content idea for this video..."
                        value={newVideoIdea}
                        onChange={(e) => setNewVideoIdea(e.target.value)}
                        data-testid="textarea-new-video-idea"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Views</label>
                      <Input
                        placeholder="e.g., 1.5M, 500K, 25.3K..."
                        value={newVideoViews}
                        onChange={(e) => setNewVideoViews(e.target.value)}
                        data-testid="input-new-video-views"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Video Link</label>
                      <Input
                        placeholder="https://youtube.com/..."
                        value={newVideoLink}
                        onChange={(e) => setNewVideoLink(e.target.value)}
                        data-testid="input-new-video-link"
                      />
                    </div>
                    <Button
                      onClick={handleAddVideoLink}
                      disabled={!selectedNiche || !newVideoIdea.trim() || !newVideoLink.trim()}
                      className="w-full"
                      data-testid="button-save-video-link"
                    >
                      Add Link
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredNiches.map((niche) => (
                <Card key={niche} className="hover:shadow-lg transition-shadow" data-testid={`niche-links-${niche}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CardTitle className="text-lg capitalize">{niche}</CardTitle>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="p-1 h-auto text-muted-foreground hover:text-foreground"
                          onClick={() => handleRenameNiche(niche)}
                          title="Rename Niche"
                          data-testid={`button-rename-niche-links-${niche}`}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center space-x-1">
                        {nicheViews[niche] && (
                          <Badge variant="secondary" className="text-xs flex items-center space-x-1">
                            <Eye className="h-3 w-3" />
                            <span>{formatViews(nicheViews[niche])}</span>
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs flex items-center space-x-1">
                          <Video className="h-3 w-3" />
                          <span>{nicheLinks[niche]?.length || 0}</span>
                        </Badge>
                        {(() => {
                          const template = getTemplate(niche);
                          return template && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="p-1 h-auto text-blue-600 hover:text-blue-700"
                                onClick={() => handleEditTemplate(template)}
                                title="Edit template content"
                                data-testid={`button-edit-template-links-${niche}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="p-1 h-auto text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteTemplate(template)}
                                title="Delete template"
                                data-testid={`button-delete-template-links-${niche}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {nicheLinks[niche]?.slice(0, 3).map((videoData, index) => {
                      return (
                        <div key={index} className="border border-border rounded-lg p-4 group hover:shadow-md transition-shadow">
                          <div className="space-y-3">
                            {/* Video Title */}
                            <h5 className="text-base font-medium text-foreground line-clamp-2">
                              {videoData.title}
                            </h5>
                            
                            {/* Link */}
                            <div className="flex items-center space-x-2 group-inner">
                              <Link className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <a 
                                href={videoData.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 hover:underline text-sm flex-1 truncate"
                                title={videoData.link}
                              >
                                {videoData.link}
                              </a>
                              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="p-1 h-auto"
                                  onClick={() => copyToClipboard(videoData.link)}
                                  title="Copy link"
                                  data-testid={`button-copy-link-${index}`}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="p-1 h-auto text-red-600 hover:text-red-700"
                                  onClick={() => handleDeleteVideoLink(niche, index)}
                                  title="Delete link"
                                  data-testid={`button-delete-link-${index}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            
                            {/* Views */}
                            {videoData.views && (
                              <div className="flex items-center space-x-2">
                                <Eye className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium text-foreground">{formatViews(videoData.views)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    
                    {nicheLinks[niche] && nicheLinks[niche].length > 2 && (
                      <div className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedNiche(niche);
                            // Show all links modal
                          }}
                        >
                          View all {nicheLinks[niche].length} videos
                        </Button>
                      </div>
                    )}
                    
                    <div className="pt-2 border-t">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedNiche(niche);
                          setShowAddLinkDialog(true);
                        }}
                        className="w-full flex items-center space-x-2"
                        data-testid={`button-add-link-${niche}`}
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Link</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Ideas Tab */}
          <TabsContent value="ideas" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Content Ideas by Niche</h3>
              <Dialog open={showAddIdeaDialog} onOpenChange={setShowAddIdeaDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>Add Idea</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Content Idea</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Select Niche</label>
                      <Select value={selectedNiche} onValueChange={setSelectedNiche}>
                        <SelectTrigger data-testid="select-niche-for-idea">
                          <SelectValue placeholder="Choose a niche" />
                        </SelectTrigger>
                        <SelectContent>
                          {niches.map((niche: string) => (
                            <SelectItem key={niche} value={niche}>
                              {niche}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium">Content Idea</label>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleGenerateIdea}
                          disabled={generateIdeaMutation.isPending}
                          className="flex items-center space-x-1"
                          data-testid="button-generate-idea-ai"
                        >
                          {generateIdeaMutation.isPending ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                              <span>Enhancing...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3 w-3" />
                              <span>Enhance with AI</span>
                            </>
                          )}
                        </Button>
                      </div>
                      <Textarea
                        placeholder="Write your content idea, then click 'Enhance with AI' to improve it..."
                        value={newIdea}
                        onChange={(e) => setNewIdea(e.target.value)}
                        data-testid="textarea-new-idea"
                        rows={3}
                      />
                    </div>
                    <Button
                      onClick={handleAddIdea}
                      disabled={!selectedNiche || !newIdea.trim()}
                      className="w-full"
                      data-testid="button-save-idea"
                    >
                      Add Idea
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {Object.keys(nicheIdeas).filter(niche =>
                !searchQuery || niche.toLowerCase().includes(searchQuery.toLowerCase())
              ).map((niche) => (
                <Card key={niche} className="hover:shadow-lg transition-shadow" data-testid={`niche-ideas-${niche}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CardTitle className="text-lg capitalize">{niche}</CardTitle>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="p-1 h-auto text-muted-foreground hover:text-foreground"
                          onClick={() => handleRenameNiche(niche)}
                          title="Rename Niche"
                          data-testid={`button-rename-niche-ideas-${niche}`}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs flex items-center space-x-1">
                          <Lightbulb className="h-3 w-3" />
                          <span>{nicheIdeas[niche]?.length || 0} Ideas</span>
                        </Badge>
                        {(() => {
                          const template = getTemplate(niche);
                          return template && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="p-1 h-auto text-blue-600 hover:text-blue-700"
                                onClick={() => handleEditTemplate(template)}
                                title="Edit template content"
                                data-testid={`button-edit-template-ideas-${niche}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="p-1 h-auto text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteTemplate(template)}
                                title="Delete template"
                                data-testid={`button-delete-template-ideas-${niche}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {nicheIdeas[niche]?.map((idea, index) => (
                      <div key={index} className="p-4 border border-border rounded-lg bg-card group hover:shadow-md transition-shadow">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="text-xs">
                                Content Idea
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                #{index + 1}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="p-1 h-auto"
                                onClick={() => copyToClipboard(idea)}
                                title="Copy content idea"
                                data-testid={`button-copy-idea-${index}`}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="p-1 h-auto text-blue-600 hover:text-blue-700"
                                onClick={() => {
                                  setEditingIdea({niche, index, idea});
                                  setEditIdeaText(idea);
                                }}
                                title="Edit idea"
                                data-testid={`button-edit-idea-${index}`}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="p-1 h-auto text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteIdea(niche, index)}
                                title="Delete idea"
                                data-testid={`button-delete-idea-${index}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="text-sm text-foreground leading-relaxed">
                            {idea}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <div className="pt-3 border-t border-dashed">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedNiche(niche);
                          setShowAddIdeaDialog(true);
                        }}
                        className="w-full flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/10 dark:to-green-900/10 hover:from-blue-100 hover:to-green-100 dark:hover:from-blue-900/20 dark:hover:to-green-900/20"
                        data-testid={`button-add-idea-${niche}`}
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add New Idea</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Follow-ups Tab */}
          <TabsContent value="followups" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Follow-up Templates</h3>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowGenerateFollowupDialog(true)}
                  className="flex items-center space-x-2"
                  data-testid="button-generate-followup"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Generate with AI</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowAddFollowupDialog(true)}
                  className="flex items-center space-x-2"
                  data-testid="button-add-followup"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Template</span>
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Base Template */}
              <Card className="border-2 border-dashed border-blue-200 dark:border-blue-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-foreground">Base Follow-up Template</h4>
                      <Badge variant="outline" className="text-xs">
                        Default
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard("I hope this message finds you well. I'm reaching out to wish you a great day and to kindly follow up on my last email, as I haven't received a response yet. I look forward to your reply.")}
                      title="Copy base template"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-foreground leading-relaxed">
                      I hope this message finds you well. I'm reaching out to wish you a great day and to kindly follow up on my last email, as I haven't received a response yet. I look forward to your reply.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* User Templates */}
              {followupTemplates.map((template: FollowupTemplate) => (
                <Card key={template.id} data-testid={`followup-template-${template.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium text-foreground">{template.name}</h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(template.template)}
                        title="Copy template"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed" data-testid={`followup-content-${template.id}`}>
                        {template.template}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Last updated: {new Date(template.updatedAt || "").toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {followupTemplates.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">No custom follow-up templates yet</p>
                    <p className="text-sm text-muted-foreground mt-2">Use the base template above or create your own variations</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <TemplateModal
        open={showTemplateModal}
        onOpenChange={setShowTemplateModal}
        template={selectedTemplate}
      />

      {/* Add Follow-up Dialog */}
      <Dialog open={showAddFollowupDialog} onOpenChange={setShowAddFollowupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Follow-up Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Template Name</label>
              <Input
                placeholder="e.g., Polite Follow-up, Urgent Follow-up..."
                value={newFollowupName}
                onChange={(e) => setNewFollowupName(e.target.value)}
                data-testid="input-followup-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Follow-up Template</label>
              <Textarea
                placeholder="Enter your follow-up message..."
                value={newFollowupTemplate}
                onChange={(e) => setNewFollowupTemplate(e.target.value)}
                data-testid="textarea-followup-template"
                rows={6}
              />
            </div>
            <div className="flex items-center space-x-2 pt-4">
              <Button
                onClick={handleAddFollowup}
                disabled={createFollowupMutation.isPending || !newFollowupName.trim() || !newFollowupTemplate.trim()}
                className="flex-1"
                data-testid="button-save-followup"
              >
                {createFollowupMutation.isPending ? "Saving..." : "Save Template"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setNewFollowupName("");
                  setNewFollowupTemplate("");
                  setShowAddFollowupDialog(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate Follow-up Dialog */}
      <Dialog open={showGenerateFollowupDialog} onOpenChange={setShowGenerateFollowupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Follow-up with AI</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">What kind of follow-up do you need?</label>
              <Textarea
                placeholder="e.g., A polite follow-up for a collaboration proposal, An urgent follow-up for time-sensitive campaigns..."
                value={generateFollowupPrompt}
                onChange={(e) => setGenerateFollowupPrompt(e.target.value)}
                data-testid="textarea-generate-prompt"
                rows={4}
              />
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center space-x-2 mb-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">AI Generation</span>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                AI will create a professional follow-up message based on your prompt. You can review and edit it before saving.
              </p>
            </div>
            <div className="flex items-center space-x-2 pt-4">
              <Button
                onClick={handleGenerateFollowup}
                disabled={generateFollowupMutation.isPending || !generateFollowupPrompt.trim()}
                className="flex-1 flex items-center space-x-2"
                data-testid="button-generate-ai-followup"
              >
                {generateFollowupMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Generate with AI</span>
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setGenerateFollowupPrompt("");
                  setShowGenerateFollowupDialog(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Idea Dialog */}
      {editingIdea && (
        <Dialog open={!!editingIdea} onOpenChange={() => {setEditingIdea(null); setEditIdeaText("");}}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Content Idea</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Content Idea for {editingIdea.niche}</label>
                <Textarea
                  placeholder="Edit your content idea..."
                  value={editIdeaText}
                  onChange={(e) => setEditIdeaText(e.target.value)}
                  data-testid="textarea-edit-idea"
                  rows={4}
                />
              </div>
              <div className="flex items-center space-x-2 pt-4">
                <Button
                  onClick={handleEditIdea}
                  disabled={updateTemplateMutation.isPending || !editIdeaText.trim()}
                  className="flex-1 flex items-center space-x-2"
                  data-testid="button-save-edited-idea"
                >
                  {updateTemplateMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingIdea(null);
                    setEditIdeaText("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Import Templates Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Content Templates</DialogTitle>
            <DialogDescription>
              Import video links and ideas from an Excel file. The file should have "Links by Niche" and "Ideas by Niche" sheets.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleImportTemplates(file);
                }
              }}
              data-testid="input-templates-file"
            />
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <p><strong>Expected format:</strong></p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li><strong>Links by Niche:</strong> Columns: Nicho, Link, Título, Ideas, Views</li>
                <li><strong>Ideas by Niche:</strong> Columns: Nicho, Idea</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}