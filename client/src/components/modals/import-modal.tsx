import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, Check, X, AlertCircle, Building } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { apiRequest } from "@/lib/queryClient";

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedRow {
  [key: string]: string | string[] | undefined;
}

interface ColumnMapping {
  [fileColumn: string]: string;
}

const BRAND_REQUIRED_FIELDS = ['marca', 'correo', 'nicho'];
const BRAND_OPTIONAL_FIELDS = ['contacto', 'campania', 'estado', 'seguimientoModelo', 'notes'];
const BRAND_ALL_FIELDS = [...BRAND_REQUIRED_FIELDS, ...BRAND_OPTIONAL_FIELDS];

const NICHE_FIELDS = ['nicho', 'idea', 'videoLinks'];

export function ImportModal({ open, onOpenChange }: ImportModalProps) {
  const [activeTab, setActiveTab] = useState("brands");
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [fileColumns, setFileColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const importBrandsMutation = useMutation({
    mutationFn: (data: any[]) => apiRequest('POST', '/api/import/brands', { items: data }),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Import Successful",
        description: `Successfully imported ${response.created} brands`,
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import brands",
        variant: "destructive",
      });
    },
  });

  const importNicheAssetsMutation = useMutation({
    mutationFn: (data: any[]) => apiRequest('POST', '/api/import/niche-assets', { items: data }),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-templates"] });
      toast({
        title: "Import Successful", 
        description: `Successfully processed ${response.processed} niche assets`,
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import niche assets",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
        
        if (jsonData.length < 2) {
          setErrors(["File must contain at least a header row and one data row"]);
          return;
        }

        const headers = jsonData[0].map(h => String(h).trim()).filter(h => h !== '');
        const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ""));
        
        setFileColumns(headers);
        
        // Parse rows into objects
        const parsed: ParsedRow[] = rows.map(row => {
          const obj: ParsedRow = {};
          headers.forEach((header, index) => {
            const value = row[index];
            if (value !== undefined && value !== "") {
              // For niche assets, handle video links (could be comma or semicolon separated)
              if (activeTab === "niche-assets" && header.toLowerCase().includes('link')) {
                obj[header] = String(value).split(/[,;]/).map(link => link.trim()).filter(Boolean);
              } else {
                obj[header] = String(value).trim();
              }
            }
          });
          return obj;
        });
        
        setParsedData(parsed);
        
        // Auto-map common columns
        const autoMapping: ColumnMapping = {};
        headers.forEach(col => {
          const lowerCol = col.toLowerCase();
          if (activeTab === "brands") {
            if (lowerCol.includes('marca') || lowerCol.includes('brand')) autoMapping[col] = 'marca';
            else if (lowerCol.includes('correo') || lowerCol.includes('email')) autoMapping[col] = 'correo';
            else if (lowerCol.includes('nicho') || lowerCol.includes('niche')) autoMapping[col] = 'nicho';
            else if (lowerCol.includes('contacto') || lowerCol.includes('contact')) autoMapping[col] = 'contacto';
            else if (lowerCol.includes('campania') || lowerCol.includes('campaign')) autoMapping[col] = 'campania';
            else if (lowerCol.includes('estado') || lowerCol.includes('status')) autoMapping[col] = 'estado';
            else if (lowerCol.includes('seguimiento') || lowerCol.includes('followup')) autoMapping[col] = 'seguimientoModelo';
            else if (lowerCol.includes('notes') || lowerCol.includes('nota')) autoMapping[col] = 'notes';
          } else {
            if (lowerCol.includes('nicho') || lowerCol.includes('niche')) autoMapping[col] = 'nicho';
            else if (lowerCol.includes('idea') || lowerCol.includes('content')) autoMapping[col] = 'idea';
            else if (lowerCol.includes('link') || lowerCol.includes('video')) autoMapping[col] = 'videoLinks';
          }
        });
        
        setColumnMapping(autoMapping);
        setErrors([]);
        setShowPreview(true);
      } catch (error) {
        setErrors(["Failed to parse file. Please ensure it's a valid Excel (.xlsx) or CSV file."]);
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  const validateMapping = (): string[] => {
    const errors: string[] = [];
    const requiredFields = activeTab === "brands" ? BRAND_REQUIRED_FIELDS : ['nicho'];
    
    for (const field of requiredFields) {
      const isMapped = Object.values(columnMapping).includes(field);
      if (!isMapped) {
        errors.push(`Required field '${field}' is not mapped`);
      }
    }
    
    return errors;
  };

  const transformData = () => {
    const validationErrors = validateMapping();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return null;
    }

    const targetFields = activeTab === "brands" ? BRAND_ALL_FIELDS : NICHE_FIELDS;
    
    return parsedData.map(row => {
      const transformed: any = {};
      Object.entries(columnMapping).forEach(([fileCol, targetField]) => {
        if (targetField !== "__SKIP__" && targetFields.includes(targetField) && row[fileCol] !== undefined) {
          transformed[targetField] = row[fileCol];
        }
      });
      return transformed;
    }).filter(item => {
      // Filter out rows that don't have required fields
      if (activeTab === "brands") {
        return item.marca && item.correo && item.nicho;
      } else {
        return item.nicho;
      }
    });
  };

  const handleImport = () => {
    const transformedData = transformData();
    if (!transformedData) return;
    
    if (activeTab === "brands") {
      importBrandsMutation.mutate(transformedData);
    } else {
      importNicheAssetsMutation.mutate(transformedData);
    }
  };

  const handleClose = () => {
    setParsedData([]);
    setColumnMapping({});
    setFileColumns([]);
    setFileName("");
    setShowPreview(false);
    setErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onOpenChange(false);
  };

  const getPreviewData = () => {
    const transformed = transformData();
    return transformed?.slice(0, 5) || [];
  };

  const isImporting = importBrandsMutation.isPending || importNicheAssetsMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Import Data from Excel/CSV</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="brands" data-testid="tab-import-brands">Import Brands</TabsTrigger>
            <TabsTrigger value="niche-assets" data-testid="tab-import-niche-assets">Import Niche Assets</TabsTrigger>
          </TabsList>

          <TabsContent value="brands" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Import Brand List
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload an Excel or CSV file containing brand information. Required columns: marca/brand, correo/email, nicho/niche.
                  Optional: contacto/contact, campania/campaign, estado/status, seguimientoModelo/followup, notes.
                </p>
                {!showPreview && (
                  <div className="space-y-4">
                    <Label htmlFor="brands-file">Select File</Label>
                    <Input
                      id="brands-file"
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      data-testid="input-brands-file"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="niche-assets" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Import Niche Assets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload content ideas and video links for each niche. Required: nicho/niche. 
                  Optional: idea/content, links/videos (comma or semicolon separated).
                </p>
                {!showPreview && (
                  <div className="space-y-4">
                    <Label htmlFor="niche-assets-file">Select File</Label>
                    <Input
                      id="niche-assets-file"
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      data-testid="input-niche-assets-file"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {errors.length > 0 && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Validation Errors:</span>
              </div>
              <ul className="mt-2 text-sm text-destructive">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {showPreview && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Column Mapping</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Map your file columns to the required fields. File: {fileName}
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {fileColumns.map(col => (
                    <div key={col} className="space-y-2">
                      <Label>{col}</Label>
                      <Select
                        value={columnMapping[col] || ""}
                        onValueChange={(value) => 
                          setColumnMapping(prev => ({ ...prev, [col]: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select target field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__SKIP__">Don't import</SelectItem>
                          {(activeTab === "brands" ? BRAND_ALL_FIELDS : NICHE_FIELDS)
                            .filter(field => field && field.trim() !== '') // Filter out empty or null values
                            .map(field => (
                              <SelectItem key={field} value={field}>
                                {field} {BRAND_REQUIRED_FIELDS.includes(field) || field === 'nicho' ? '*' : ''}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preview (First 5 rows)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {(activeTab === "brands" ? BRAND_ALL_FIELDS : NICHE_FIELDS).map(field => (
                        <TableHead key={field}>
                          {field} {(BRAND_REQUIRED_FIELDS.includes(field) || field === 'nicho') && 
                            <Badge variant="secondary" className="ml-1">Required</Badge>
                          }
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getPreviewData().map((row, index) => (
                      <TableRow key={index}>
                        {(activeTab === "brands" ? BRAND_ALL_FIELDS : NICHE_FIELDS).map(field => (
                          <TableCell key={field}>
                            {Array.isArray(row[field]) 
                              ? row[field].join(', ')
                              : row[field] || '-'
                            }
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleClose} disabled={isImporting}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={isImporting || errors.length > 0} data-testid="button-import">
                {isImporting ? "Importing..." : `Import ${parsedData.length} rows`}
              </Button>
            </div>
          </div>
        )}

        {!showPreview && fileName && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileSpreadsheet className="h-4 w-4" />
            Selected: {fileName}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}