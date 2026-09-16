import pg from "pg";
import * as fs from "fs";

const databaseUrl = "postgresql://neondb_owner:npg_N1RMyjtKoL2Y@ep-restless-fog-aqkiyb35.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require";
const userId = "116630391775518035940"; // ceo.hanktech@gmail.com

async function main() {
  console.log("Connecting to database...");
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  const csvPath = "/Users/ceo.hanktechgmail.com/Downloads/Codigo de software de Patrocinios/IFA_2026_Leads.csv";
  console.log("Reading CSV file...");
  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split("\n").map(l => l.trim()).filter(Boolean);
  
  // Skip header line
  const rows = lines.slice(1);
  console.log(`Found ${rows.length} rows to import.`);

  let importedCount = 0;
  for (const row of rows) {
    const parts = row.split(",").map(p => p.trim());
    if (parts.length < 7) continue;

    const [marca, correo, contacto, nicho, campania, estado, notes] = parts;
    
    // Check if the brand with this email already exists for the user
    const checkExist = await client.query(
      "SELECT id FROM brands WHERE user_id = $1 AND (LOWER(correo) = LOWER($2))",
      [userId, correo]
    );

    if (checkExist.rows.length > 0) {
      console.log(`Brand ${marca} with email ${correo} already exists in DB. Skipping.`);
      continue;
    }

    await client.query(
      `INSERT INTO brands (user_id, marca, correo, correos, contacto, contactos, nicho, campania, estado, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [userId, marca, correo, [], contacto, [], nicho, campania, estado, notes]
    );
    console.log(`Imported brand: ${marca} (${correo})`);
    importedCount++;
  }

  console.log(`Import completed successfully. Imported ${importedCount} brands.`);
  await client.end();
}

main().catch(console.error);
