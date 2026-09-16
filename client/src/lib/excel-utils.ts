import * as XLSX from 'xlsx';
import type { Brand, ContentTemplate } from '@shared/schema';

// Export brands data to Excel
export function exportBrandsToExcel(brands: Brand[]) {
  // Create separate sheets for brands and campaigns
  const brandsData = brands.map(brand => ({
    'Marca': brand.marca,
    'Correo Principal': brand.correo,
    'Correos Adicionales': brand.correos ? brand.correos.join(', ') : '',
    'Contacto Principal': brand.contacto || '',
    'Contactos Adicionales': brand.contactos ? brand.contactos.join(', ') : '',
    'Nicho': brand.nicho,
    'Campaña': brand.campania || '',
    'Estado': brand.estado || 'Pending',
    'Fecha de Envío': brand.fechaEnvio ? new Date(brand.fechaEnvio).toLocaleDateString() : '',
    'Seguimiento Modelo': brand.seguimientoModelo || '',
    'Notas': brand.notes || '',
    'Fecha de Creación': brand.createdAt ? new Date(brand.createdAt).toLocaleDateString() : ''
  }));

  // Extract unique campaigns
  const uniqueCampaigns = new Set(brands.map(b => b.campania).filter(c => c && c.trim() !== ''));
  const campaigns = Array.from(uniqueCampaigns).map(campaign => ({ 'Campaña': campaign }));

  // Create workbook
  const workbook = XLSX.utils.book_new();
  
  // Add brands sheet
  const brandsSheet = XLSX.utils.json_to_sheet(brandsData);
  XLSX.utils.book_append_sheet(workbook, brandsSheet, 'Marcas');
  
  // Add campaigns sheet
  const campaignSheet = XLSX.utils.json_to_sheet(campaigns);
  XLSX.utils.book_append_sheet(workbook, campaignSheet, 'Campañas');

  // Generate filename with current date
  const currentDate = new Date().toISOString().split('T')[0];
  const filename = `brands-export-${currentDate}.xlsx`;
  
  // Save file
  XLSX.writeFile(workbook, filename);
  
  return filename;
}

// Export content templates to Excel  
export function exportContentTemplatesToExcel(templates: ContentTemplate[]) {
  const videoLinksData: any[] = [];
  const ideasData: any[] = [];

  templates.forEach(template => {
    // Extract video links data
    if (template.videoLinks && template.videoLinks.length > 0) {
      template.videoLinks.forEach((link, index) => {
        videoLinksData.push({
          'Nicho': template.nicho,
          'Link': link,
          'Título': template.videoTitles?.[index] || '',
          'Ideas': template.videoIdeas?.[index] || '',
          'Views': template.videoViews?.[index] || template.views || ''
        });
      });
    }

    // Extract ideas data (from idea field)
    if (template.idea) {
      // Split ideas by new lines and clean them
      const lines = template.idea.split(/\n/).map(line => line.trim()).filter(line => line);
      
      lines.forEach(line => {
        // Remove bullet points
        let cleanLine = line.replace(/^[•\-\*]\s*/, '').trim();
        
        if (cleanLine) {
          // Extract the main idea from various formatted patterns
          let extractedIdea = null;
          
          // Pattern 1: "I propose the following content idea: "IDEA""
          let match = cleanLine.match(/I propose the following content idea:\s*["""''„"]\s*([^"""''„"]+?)\s*["""''„"]/i);
          if (match) {
            extractedIdea = match[1].trim();
          }
          
          // Pattern 2: "I propose the following content idea: 'IDEA'"
          if (!extractedIdea) {
            match = cleanLine.match(/I propose the following content idea:\s*['\']\s*([^'\'']+?)\s*['\']/i);
            if (match) {
              extractedIdea = match[1].trim();
            }
          }
          
          // Pattern 3: Content after "content idea:" without quotes
          if (!extractedIdea) {
            match = cleanLine.match(/content idea:\s*(.+?)$/i);
            if (match && !match[1].includes('according to') && !match[1].includes('http')) {
              extractedIdea = match[1].replace(/^["""''„"'\']\s*|\s*["""''„"'\']$/g, '').trim();
            }
          }
          
          // If we found a formatted idea, add it
          if (extractedIdea && extractedIdea.length > 3) {
            ideasData.push({
              'Nicho': template.nicho,
              'Idea': extractedIdea
            });
          }
          // Otherwise, check if it's a simple standalone idea
          else if (!cleanLine.toLowerCase().includes('i want to show you') && 
                   !cleanLine.toLowerCase().includes('according to the link') && 
                   !cleanLine.toLowerCase().includes('in order to achieve') &&
                   !cleanLine.includes('http') &&
                   !cleanLine.toLowerCase().includes('propose the following') &&
                   cleanLine.length > 5 && 
                   cleanLine.length < 300) {
            ideasData.push({
              'Nicho': template.nicho,
              'Idea': cleanLine
            });
          }
        }
      });
    }
  });

  // Create workbook
  const workbook = XLSX.utils.book_new();
  
  // Add video links sheet
  const videoLinksSheet = XLSX.utils.json_to_sheet(videoLinksData);
  XLSX.utils.book_append_sheet(workbook, videoLinksSheet, 'Links by Niche');
  
  // Add ideas sheet  
  const ideasSheet = XLSX.utils.json_to_sheet(ideasData);
  XLSX.utils.book_append_sheet(workbook, ideasSheet, 'Ideas by Niche');

  // Generate filename with current date
  const currentDate = new Date().toISOString().split('T')[0];
  const filename = `content-templates-export-${currentDate}.xlsx`;
  
  // Save file
  XLSX.writeFile(workbook, filename);
  
  return filename;
}

// Import campaigns from Excel file
export async function importCampaignsFromExcel(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Try to find campaigns sheet or use first sheet
        let sheetName = workbook.SheetNames.find(name => 
          name.toLowerCase().includes('campañas') || 
          name.toLowerCase().includes('campaigns')
        ) || workbook.SheetNames[0];
        
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        // Extract campaigns from first column or find column with campaigns
        const campaigns: string[] = [];
        
        // Skip header row and extract campaign names
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row && row[0] && typeof row[0] === 'string') {
            const campaign = row[0].toString().trim();
            if (campaign && !campaigns.includes(campaign)) {
              campaigns.push(campaign);
            }
          }
        }
        
        resolve(campaigns);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsArrayBuffer(file);
  });
}

// Import content templates from Excel file
export async function importContentTemplatesFromExcel(file: File): Promise<{
  videoLinks: Array<{niche: string, link: string, title: string, ideas: string, views: string}>,
  ideas: Array<{niche: string, idea: string}>
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const videoLinks: any[] = [];
        const ideas: any[] = [];
        
        // Process video links sheet
        let videoLinksSheet = workbook.SheetNames.find(name => 
          name.toLowerCase().includes('links') || 
          name.toLowerCase().includes('video')
        );
        
        if (videoLinksSheet) {
          const worksheet = workbook.Sheets[videoLinksSheet];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
          
          jsonData.forEach(row => {
            if (row.Nicho && row.Link) {
              videoLinks.push({
                niche: row.Nicho.toString().trim(),
                link: row.Link.toString().trim(),
                title: row.Título?.toString().trim() || row.Title?.toString().trim() || '',
                ideas: row.Ideas?.toString().trim() || '',
                views: row.Views?.toString().trim() || ''
              });
            }
          });
        }
        
        // Process ideas sheet
        let ideasSheet = workbook.SheetNames.find(name => 
          name.toLowerCase().includes('ideas')
        );
        
        if (ideasSheet) {
          const worksheet = workbook.Sheets[ideasSheet];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
          
          jsonData.forEach(row => {
            if (row.Nicho && row.Idea) {
              ideas.push({
                niche: row.Nicho.toString().trim(),
                idea: row.Idea.toString().trim()
              });
            }
          });
        }
        
        resolve({ videoLinks, ideas });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsArrayBuffer(file);
  });
}