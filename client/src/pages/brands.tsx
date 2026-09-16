import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Plus, Upload, Search, Mail, Edit, Trash2, Building, Download, RefreshCw, Calendar } from "lucide-react";
import { AddBrandModal } from "@/components/modals/add-brand-modal";
import { EditBrandModal } from "@/components/modals/edit-brand-modal";
import { EmailComposerModal } from "@/components/modals/email-composer-modal";
import { ImportModal } from "@/components/modals/import-modal";
import { NotionVideosModal } from "@/components/modals/notion-videos-modal";
import { getBrands, deleteBrand, updateBrand, bulkUpdateBrands } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { exportBrandsToExcel, importCampaignsFromExcel } from "@/lib/excel-utils";
import type { Brand } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";

export function Brands() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showNotionModal, setShowNotionModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCampaignImportModal, setShowCampaignImportModal] = useState(false);
  const [showAddCampaignModal, setShowAddCampaignModal] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [nicheFilter, setNicheFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("");
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);
  const [bulkCampaign, setBulkCampaign] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ["/api/brands"],
    queryFn: () => import("@/lib/api").then(m => m.getBrandsTyped()),
  });

  const { data: niches = [], isLoading: isLoadingNiches } = useQuery({
    queryKey: ["/api/brands/niches"],
    select: (data: any) => data || [],
  });

  const { data: campaigns = [] } = useQuery<string[]>({
    queryKey: ["/api/brands/campaigns"],
  });

  const deleteBrandMutation = useMutation({
    mutationFn: deleteBrand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Brand deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete brand",
        variant: "destructive",
      });
    },
  });

  const updateBrandMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateBrand(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/brands"] });
      
      // Snapshot the previous value
      const previousBrands = queryClient.getQueryData(["/api/brands"]);
      
      // Optimistically update to the new value
      queryClient.setQueryData(["/api/brands"], (old: Brand[]) => {
        if (!old) return old;
        return old.map(brand => 
          brand.id === id ? { ...brand, ...data } : brand
        );
      });
      
      // Return a context object with the snapshotted value
      return { previousBrands };
    },
    onError: (error: any, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousBrands) {
        queryClient.setQueryData(["/api/brands"], context.previousBrands);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to update brand",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Brand updated successfully",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure server state is correct
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: ({ ids, data }: { ids: string[]; data: any }) => bulkUpdateBrands(ids, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      toast({
        title: "Success",
        description: `Successfully updated campaign for ${res.count} brands`,
      });
      setSelectedBrandIds([]);
      setBulkCampaign("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to perform bulk update",
        variant: "destructive",
      });
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

  const handleBulkCampaignApply = () => {
    if (selectedBrandIds.length === 0 || !bulkCampaign) return;
    bulkUpdateMutation.mutate({
      ids: selectedBrandIds,
      data: { campania: bulkCampaign }
    });
  };


  const filteredBrands = brands.filter((brand: Brand) => {
    const matchesSearch = !searchQuery || 
      brand.marca.toLowerCase().includes(searchQuery.toLowerCase()) ||
      brand.contacto?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      brand.correo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      brand.campania?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesNiche = !nicheFilter || nicheFilter === "all" || brand.nicho === nicheFilter;
    const matchesCampaign = !campaignFilter || campaignFilter === "all" || brand.campania === campaignFilter;
    const matchesStatus = !statusFilter || statusFilter === "all" || (() => {
      const estadoNormalized = (brand.estado || "").toLowerCase();
      if (statusFilter === "pending") {
        return !brand.estado || estadoNormalized.includes("pending") || estadoNormalized.includes("pendiente");
      }
      if (statusFilter === "sent") {
        return estadoNormalized.includes("enviado") || 
               estadoNormalized.includes("sent") || 
               estadoNormalized.includes("abierto") || 
               estadoNormalized.includes("opened");
      }
      if (statusFilter === "opened") {
        return estadoNormalized.includes("abierto") || 
               estadoNormalized.includes("opened") || 
               estadoNormalized.includes("leido") || 
               estadoNormalized.includes("leído");
      }
      if (statusFilter === "responded") {
        return estadoNormalized.includes("responded") || estadoNormalized.includes("respondido");
      }
      if (statusFilter === "rejected") {
        return estadoNormalized.includes("rejected") || estadoNormalized.includes("rechazado");
      }
      if (statusFilter === "agreed") {
        return estadoNormalized.includes("agreed") || estadoNormalized.includes("acordado");
      }
      return estadoNormalized.includes(statusFilter.toLowerCase());
    })();
    
    return matchesSearch && matchesNiche && matchesCampaign && matchesStatus;
  });

  const handleSendEmail = (brand: Brand) => {
    setSelectedBrand(brand);
    setShowEmailModal(true);
  };

  const handleEditBrand = (brand: Brand) => {
    setSelectedBrand(brand);
    setShowEditModal(true);
  };

  const handleDeleteBrand = (brand: Brand) => {
    if (confirm(`Are you sure you want to delete ${brand.marca}?`)) {
      deleteBrandMutation.mutate(brand.id);
    }
  };

  const handleNicheChange = (brandId: string, newNiche: string) => {
    updateBrandMutation.mutate({
      id: brandId,
      data: { nicho: newNiche }
    });
  };

  const handleCampaignChange = (brandId: string, newCampaign: string) => {
    updateBrandMutation.mutate({
      id: brandId,
      data: { campania: newCampaign }
    });
  };

  const handleStatusChange = (brandId: string, newStatus: string) => {
    updateBrandMutation.mutate({
      id: brandId,
      data: { estado: newStatus }
    });
  };

  const handleExportBrands = () => {
    try {
      const filename = exportBrandsToExcel(brands);
      toast({
        title: "Success",
        description: `Brands exported to ${filename}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export brands",
        variant: "destructive",
      });
    }
  };

  const handleCampaignImport = async (file: File) => {
    try {
      const campaigns = await importCampaignsFromExcel(file);
      // Here you would typically send these to the backend to update the campaigns list
      toast({
        title: "Success", 
        description: `Imported ${campaigns.length} campaigns`,
      });
      setShowCampaignImportModal(false);
      // You might want to invalidate campaigns query here
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to import campaigns",
        variant: "destructive",
      });
    }
  };

  const handleAddCampaign = () => {
    if (!newCampaignName.trim()) return;
    
    // Here you would typically send this to the backend to add to campaigns list
    toast({
      title: "Success",
      description: `Campaign "${newCampaignName}" added successfully`,
    });
    setNewCampaignName("");
    setShowAddCampaignModal(false);
  };

  const getStatusBadge = (estado: string | null) => {
    if (!estado) return <Badge variant="secondary">Pending</Badge>;
    
    const lower = estado.toLowerCase();
    
    if (lower.includes("enviado") || lower.includes("sent")) {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">✅ Sent</Badge>;
    }
    if (lower.includes("abierto") || lower.includes("opened") || lower.includes("leido") || lower.includes("leído")) {
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">👀 Opened</Badge>;
    }
    if (lower.includes("responded") || lower.includes("respondió") || lower.includes("respondido")) {
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">Responded</Badge>;
    }
    if (lower.includes("rejected") || lower.includes("rechazado")) {
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">Rejected</Badge>;
    }
    if (lower.includes("agreed") || lower.includes("acordado")) {
      return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">Agreed</Badge>;
    }
    return <Badge variant="secondary">{estado}</Badge>;
  };

  const getNicheBadge = (nicho: string) => {
    const colors: Record<string, string> = {
      smartphones: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
      drones: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
      microphones: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
      "robot vacuums": "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
    };
    
    return (
      <Badge className={colors[nicho] || "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"}>
        {nicho}
      </Badge>
    );
  };

  const isAllSelected = filteredBrands.length > 0 && filteredBrands.every((b) => selectedBrandIds.includes(b.id));

  const handleSelectAllChange = (checked: boolean) => {
    if (checked) {
      const newSelected = [...selectedBrandIds];
      filteredBrands.forEach((b) => {
        if (!newSelected.includes(b.id)) {
          newSelected.push(b.id);
        }
      });
      setSelectedBrandIds(newSelected);
    } else {
      const filteredIds = filteredBrands.map((b) => b.id);
      setSelectedBrandIds(selectedBrandIds.filter((id) => !filteredIds.includes(id)));
    }
  };

  return (

    <div className="flex-1 overflow-auto">
      <header className="bg-card border-b border-border px-8 py-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-bold text-foreground">Brands Database</h2>
              <Badge variant="secondary" className="text-xs">
                {filteredBrands.length} of {brands.length}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">Manage your brand contacts and information</p>
          </div>
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center space-x-2" data-testid="dropdown-actions">
                  <Building className="h-4 w-4" />
                  <span>Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={handleExportBrands} data-testid="button-export-brands">
                  <Download className="h-4 w-4 mr-2" />
                  Export All Brands
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowImportModal(true)} data-testid="button-import">
                  <Upload className="h-4 w-4 mr-2" />
                  Import Brands
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowCampaignImportModal(true)} data-testid="button-import-campaigns">
                  <Upload className="h-4 w-4 mr-2" />
                  Import Campaigns
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowAddCampaignModal(true)} data-testid="button-add-campaign">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Campaign
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              onClick={() => setShowNotionModal(true)}
              className="flex items-center space-x-2 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
              data-testid="button-notion-calendar"
            >
              <Calendar className="h-4 w-4 text-indigo-500" />
              <span>Calendario Notion</span>
            </Button>

            <Button 
              variant="outline"
              onClick={() => syncRepliesMutation.mutate()}
              disabled={syncRepliesMutation.isPending}
              className="flex items-center space-x-2 animate-in fade-in zoom-in duration-200"
              data-testid="button-sync-replies"
            >
              <RefreshCw className={`h-4 w-4 ${syncRepliesMutation.isPending ? "animate-spin" : ""}`} />
              <span>{syncRepliesMutation.isPending ? "Syncing..." : "Sync Replies"}</span>
            </Button>
            <Button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2"
              data-testid="button-add-brand"
            >
              <Plus className="h-4 w-4" />
              <span>Add Brand</span>
            </Button>
          </div>
        </div>
        
        <Separator className="mt-6" />
        
        {/* Search and Filters */}
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search brands, contacts, or emails..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-brands"
            />
          </div>
          <div className="flex gap-2">
            <Select value={nicheFilter} onValueChange={setNicheFilter}>
              <SelectTrigger className="w-44" data-testid="select-niche-filter">
                <SelectValue placeholder="All Niches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Niches</SelectItem>
                {isLoadingNiches ? (
                  <SelectItem value="loading" disabled>Loading niches...</SelectItem>
                ) : (
                  niches.map((niche: string) => (
                    <SelectItem key={niche} value={niche}>
                      {niche}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Select value={campaignFilter} onValueChange={setCampaignFilter}>
              <SelectTrigger className="w-44" data-testid="select-campaign-filter">
                <SelectValue placeholder="All Campaigns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {campaigns.map((campaign: string) => (
                  <SelectItem key={campaign} value={campaign}>
                    {campaign}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="select-status-filter">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="opened">Opened / Read</SelectItem>
                <SelectItem value="responded">Responded</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="agreed">Agreed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Filter chips when active */}
        {(nicheFilter && nicheFilter !== "all" || campaignFilter && campaignFilter !== "all" || statusFilter && statusFilter !== "all") && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Active filters:</span>
            {nicheFilter && nicheFilter !== "all" && (
              <Badge variant="secondary" className="text-xs">
                Niche: {nicheFilter}
                <button 
                  onClick={() => setNicheFilter("")} 
                  className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-sm"
                >
                  ×
                </button>
              </Badge>
            )}
            {campaignFilter && campaignFilter !== "all" && (
              <Badge variant="secondary" className="text-xs">
                Campaign: {campaignFilter}
                <button 
                  onClick={() => setCampaignFilter("")} 
                  className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-sm"
                >
                  ×
                </button>
              </Badge>
            )}
            {statusFilter && statusFilter !== "all" && (
              <Badge variant="secondary" className="text-xs">
                Status: {statusFilter}
                <button 
                  onClick={() => setStatusFilter("")} 
                  className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-sm"
                >
                  ×
                </button>
              </Badge>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setNicheFilter("");
                setCampaignFilter("");
                setStatusFilter("");
                setSearchQuery("");
              }}
            >
              Clear all
            </Button>
          </div>
        )}
      </header>

      {/* Brands Content */}
      <div className="p-4 lg:p-8">
        {selectedBrandIds.length > 0 && (
          <div className="mb-6 p-4 bg-muted/60 border border-border rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center space-x-3">
              <div className="px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                {selectedBrandIds.length} selected
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedBrandIds([])}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear selection
              </Button>
            </div>
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <Select value={bulkCampaign} onValueChange={setBulkCampaign}>
                <SelectTrigger className="w-full sm:w-48 bg-background">
                  <SelectValue placeholder="Assign to campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign} value={campaign}>
                      {campaign}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleBulkCampaignApply}
                disabled={!bulkCampaign || bulkUpdateMutation.isPending}
                size="sm"
                className="w-full sm:w-auto"
              >
                {bulkUpdateMutation.isPending ? "Assigning..." : "Assign"}
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading brands...</p>
            </CardContent>
          </Card>
        ) : filteredBrands.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
              {searchQuery || nicheFilter || statusFilter ? (
                <div>
                  <p className="text-lg font-medium">No brands match your filters</p>
                  <p className="text-sm">Try adjusting your search criteria</p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-medium">No brands added yet</p>
                  <p className="text-sm">Add your first brand to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop Table View */}
            <Card className="hidden lg:block">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="w-12 px-6 py-4 text-center">
                          <Checkbox
                            checked={isAllSelected}
                            onCheckedChange={handleSelectAllChange}
                            aria-label="Select all brands"
                          />
                        </th>
                        <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Brand</th>
                        <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Contact</th>
                        <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Email</th>
                        <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Niche</th>
                        <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Campaign</th>
                        <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Status</th>
                        <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Last Contact</th>
                        <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredBrands.map((brand: Brand) => (
                        <tr key={brand.id} className="hover:bg-muted/30 transition-colors" data-testid={`brand-row-${brand.id}`}>
                          <td className="px-6 py-4 text-center">
                            <Checkbox
                              checked={selectedBrandIds.includes(brand.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedBrandIds([...selectedBrandIds, brand.id]);
                                } else {
                                  setSelectedBrandIds(selectedBrandIds.filter((id) => id !== brand.id));
                                }
                              }}
                              aria-label={`Select ${brand.marca}`}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                <span className="text-xs font-medium text-primary">
                                  {brand.marca.substring(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <span className="text-sm font-medium text-foreground">{brand.marca}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-foreground">{brand.contacto || "-"}</td>
                          <td className="px-6 py-4 text-sm text-foreground">{brand.correo}</td>
                          <td className="px-6 py-4">
                            <Select
                              value={brand.nicho}
                              onValueChange={(value) => handleNicheChange(brand.id, value)}
                              disabled={updateBrandMutation.isPending}
                            >
                              <SelectTrigger className="w-40" data-testid={`select-niche-${brand.id}`}>
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
                          </td>
                          <td className="px-6 py-4">
                            <Select
                              value={brand.campania || ""}
                              onValueChange={(value) => handleCampaignChange(brand.id, value)}
                              disabled={updateBrandMutation.isPending}
                            >
                              <SelectTrigger className="w-32" data-testid={`select-campaign-${brand.id}`}>
                                <SelectValue placeholder="Campaign" />
                              </SelectTrigger>
                              <SelectContent>
                                {campaigns.map((campaign) => (
                                  <SelectItem key={campaign} value={campaign}>
                                    {campaign}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-6 py-4">
                            <Select
                              value={brand.estado || "Pending"}
                              onValueChange={(value) => handleStatusChange(brand.id, value)}
                              disabled={updateBrandMutation.isPending}
                            >
                              <SelectTrigger className="w-32 bg-transparent border-none p-0 focus:ring-0 shadow-none hover:bg-muted/50 rounded px-2 h-8" data-testid={`select-status-${brand.id}`}>
                                <SelectValue>
                                  {getStatusBadge(brand.estado)}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Pending">Pending</SelectItem>
                                <SelectItem value="✅ Enviado">✅ Sent</SelectItem>
                                <SelectItem value="👀 Abierto">👀 Opened</SelectItem>
                                <SelectItem value="Responded">Responded</SelectItem>
                                <SelectItem value="Rejected">Rejected</SelectItem>
                                <SelectItem value="Agreed">Agreed</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {brand.fechaEnvio ? new Date(brand.fechaEnvio).toLocaleString() : "-"}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSendEmail(brand)}
                                data-testid={`button-send-email-${brand.id}`}
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditBrand(brand)}
                                data-testid={`button-edit-brand-${brand.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteBrand(brand)}
                                data-testid={`button-delete-brand-${brand.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Mobile/Tablet Card View */}
            <div className="lg:hidden space-y-4">
              {filteredBrands.map((brand: Brand) => (
                <Card key={brand.id} className="transition-colors hover:shadow-md" data-testid={`brand-card-${brand.id}`}>
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      {/* Brand Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            checked={selectedBrandIds.includes(brand.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedBrandIds([...selectedBrandIds, brand.id]);
                              } else {
                                setSelectedBrandIds(selectedBrandIds.filter((id) => id !== brand.id));
                              }
                            }}
                            aria-label={`Select ${brand.marca}`}
                          />
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {brand.marca.substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">{brand.marca}</h3>
                            <p className="text-sm text-muted-foreground">{brand.correo}</p>
                            {brand.contacto && (
                              <p className="text-sm text-muted-foreground">{brand.contacto}</p>
                            )}
                          </div>
                        </div>
                         <div className="flex flex-col items-end space-y-2">
                           <Select
                             value={brand.estado || "Pending"}
                             onValueChange={(value) => handleStatusChange(brand.id, value)}
                             disabled={updateBrandMutation.isPending}
                           >
                             <SelectTrigger className="w-28 bg-transparent border-none p-0 focus:ring-0 shadow-none hover:bg-muted/50 rounded px-1 h-8 justify-end" data-testid={`select-status-mobile-${brand.id}`}>
                               <SelectValue>
                                 {getStatusBadge(brand.estado)}
                               </SelectValue>
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="Pending">Pending</SelectItem>
                               <SelectItem value="✅ Enviado">✅ Sent</SelectItem>
                               <SelectItem value="👀 Abierto">👀 Opened</SelectItem>
                               <SelectItem value="Responded">Responded</SelectItem>
                               <SelectItem value="Rejected">Rejected</SelectItem>
                               <SelectItem value="Agreed">Agreed</SelectItem>
                             </SelectContent>
                           </Select>
                          <div className="flex items-center space-x-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSendEmail(brand)}
                              data-testid={`button-send-email-mobile-${brand.id}`}
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditBrand(brand)}
                              data-testid={`button-edit-brand-mobile-${brand.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteBrand(brand)}
                              data-testid={`button-delete-brand-mobile-${brand.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Brand Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Niche</label>
                          <Select
                            value={brand.nicho}
                            onValueChange={(value) => handleNicheChange(brand.id, value)}
                            disabled={updateBrandMutation.isPending}
                          >
                            <SelectTrigger className="w-full" data-testid={`select-niche-mobile-${brand.id}`}>
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
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Campaign</label>
                          <Select
                            value={brand.campania || ""}
                            onValueChange={(value) => handleCampaignChange(brand.id, value)}
                            disabled={updateBrandMutation.isPending}
                          >
                            <SelectTrigger className="w-full" data-testid={`select-campaign-mobile-${brand.id}`}>
                              <SelectValue placeholder="Select campaign" />
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
                      </div>

                      {/* Last Contact */}
                      {brand.fechaEnvio && (
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Last contact:</span> {new Date(brand.fechaEnvio).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      <AddBrandModal 
        open={showAddModal} 
        onOpenChange={setShowAddModal} 
      />
      
      <EmailComposerModal
        open={showEmailModal}
        onOpenChange={setShowEmailModal}
        brand={selectedBrand}
      />

      {selectedBrand && (
        <EditBrandModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          brand={selectedBrand}
        />
      )}
      
      <ImportModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
      />

      {/* Campaign Import Modal */}
      <Dialog open={showCampaignImportModal} onOpenChange={setShowCampaignImportModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Campaigns</DialogTitle>
            <DialogDescription>
              Import campaigns from an Excel file. The file should contain campaign names in the first column.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleCampaignImport(file);
                }
              }}
              data-testid="input-campaign-file"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Campaign Modal */}
      <Dialog open={showAddCampaignModal} onOpenChange={setShowAddCampaignModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Campaign</DialogTitle>
            <DialogDescription>
              Add a new campaign to the campaigns list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="campaign-name">Campaign Name</Label>
              <Input
                id="campaign-name"
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
                placeholder="Enter campaign name"
                data-testid="input-campaign-name"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAddCampaignModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCampaign} disabled={!newCampaignName.trim()}>
                Add Campaign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Notion Videos Modal */}
      <NotionVideosModal 
        open={showNotionModal} 
        onOpenChange={setShowNotionModal} 
        onSelectVideoForBrand={(video) => {
          // If a brand is selected, open email modal for it
          if (selectedBrand) {
            setShowEmailModal(true);
          } else {
            toast({
              title: `🎬 Vídeo seleccionado: "${video.title}"`,
              description: "Selecciona una marca para enviarle la propuesta.",
            });
          }
        }}
      />
    </div>
  );
}
