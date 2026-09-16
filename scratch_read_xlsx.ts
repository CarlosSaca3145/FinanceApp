import * as XLSX from 'xlsx';
import * as fs from 'fs';

const files = [
  '/Users/ceo.hanktechgmail.com/Downloads/Codigo de software de Patrocinios/Enlaces e ideas_1758367864318.xlsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    try {
      const buf = fs.readFileSync(file);
      const workbook = XLSX.read(buf, { type: 'buffer' });
      console.log(`\nFile: ${file}`);
      console.log('Sheets:', workbook.SheetNames);
      for (const sheetName of workbook.SheetNames.slice(0, 2)) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        if (jsonData.length > 0) {
          console.log(`Sheet "${sheetName}" Headers:`, jsonData[0].slice(0, 10));
          console.log(`Sample Row:`, jsonData[1] ? jsonData[1].slice(0, 10) : 'none');
        }
      }
    } catch (e: any) {
      console.log(`Error reading ${file}:`, e.message);
    }
  } else {
    console.log(`File not found: ${file}`);
  }
}
