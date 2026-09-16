import * as XLSX from 'xlsx';
import * as fs from 'fs';

const brandFile = '/Users/ceo.hanktechgmail.com/Downloads/Codigo de software de Patrocinios/brands-export-2026-06-12.xlsx';
const templateFile = '/Users/ceo.hanktechgmail.com/Downloads/content-templates-export-2026-06-12.xlsx';

function inspect(file: string) {
  if (fs.existsSync(file)) {
    console.log(`\n=== Inspecting: ${file} ===`);
    const buf = fs.readFileSync(file);
    const workbook = XLSX.read(buf, { type: 'buffer' });
    console.log('Sheets:', workbook.SheetNames);
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);
      console.log(`Sheet "${sheetName}" row count:`, data.length);
      if (data.length > 0) {
        console.log('Sample row fields:', Object.keys(data[0]));
        console.log('Sample row content:', JSON.stringify(data[0], null, 2));
      }
    }
  } else {
    console.log(`File not found: ${file}`);
  }
}

inspect(brandFile);
inspect(templateFile);
