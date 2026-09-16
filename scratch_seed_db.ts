import pg from "pg";
import * as XLSX from "xlsx";
import * as fs from "fs";

const databaseUrl = "postgresql://neondb_owner:npg_N1RMyjtKoL2Y@ep-restless-fog-aqkiyb35.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require";
const userId = "102598924623055776561"; // c@saca.technology

async function main() {
  console.log("Connecting to database...");
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    // 1. Clear existing brands and content templates for this user to allow clean runs
    console.log("Cleaning old data for user...");
    await client.query("DELETE FROM brands WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM content_templates WHERE user_id = $1", [userId]);

    // 2. Load and parse brands Excel file
    const brandFile = "/Users/ceo.hanktechgmail.com/Downloads/Codigo de software de Patrocinios/brands-export-2026-06-12.xlsx";
    if (fs.existsSync(brandFile)) {
      console.log("Reading brands Excel file...");
      const buf = fs.readFileSync(brandFile);
      const workbook = XLSX.read(buf, { type: "buffer" });
      const sheet = workbook.Sheets["Marcas"];
      const rows = XLSX.utils.sheet_to_json(sheet) as any[];

      console.log(`Inserting ${rows.length} brands...`);
      for (const row of rows) {
        const marca = row["Marca"] ? String(row["Marca"]).trim() : "";
        if (!marca) continue;

        const correo = row["Correo Principal"] ? String(row["Correo Principal"]).trim() : "";
        const correosRaw = row["Correos Adicionales"] ? String(row["Correos Adicionales"]).trim() : "";
        const correos = correosRaw ? correosRaw.split(/[,;\s]+/).map(e => e.trim()).filter(Boolean) : [];

        const contacto = row["Contacto Principal"] ? String(row["Contacto Principal"]).trim() : null;
        const contactosRaw = row["Contactos Adicionales"] ? String(row["Contactos Adicionales"]).trim() : "";
        const contactos = contactosRaw ? contactosRaw.split(/[,;\s]+/).map(c => c.trim()).filter(Boolean) : [];

        const nicho = row["Nicho"] ? String(row["Nicho"]).trim() : "General";
        const campania = row["Campaña"] ? String(row["Campaña"]).trim() : null;
        const estado = row["Estado"] ? String(row["Estado"]).trim() : "Pending";
        
        let fechaEnvio: Date | null = null;
        if (row["Fecha de Envío"]) {
          const parsed = new Date(row["Fecha de Envío"]);
          if (!isNaN(parsed.getTime())) {
            fechaEnvio = parsed;
          }
        }

        const seguimientoModelo = row["Seguimiento Modelo"] ? String(row["Seguimiento Modelo"]).trim() : null;
        const notes = row["Notas"] ? String(row["Notas"]).trim() : null;

        await client.query(
          `INSERT INTO brands (user_id, marca, correo, correos, contacto, contactos, nicho, campania, estado, fecha_envio, seguimiento_modelo, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [userId, marca, correo, correos, contacto, contactos, nicho, campania, estado, fechaEnvio, seguimientoModelo, notes]
        );
      }
      console.log("Brands inserted successfully.");
    } else {
      console.log("Brands Excel file not found!");
    }

    // 3. Load and parse content templates
    const templatesFile = "/Users/ceo.hanktechgmail.com/Downloads/Codigo de software de Patrocinios/processed-templates.json";
    if (fs.existsSync(templatesFile)) {
      console.log("Reading content templates JSON file...");
      const templates = JSON.parse(fs.readFileSync(templatesFile, "utf-8")) as any[];

      console.log(`Inserting ${templates.length} content templates...`);
      for (const t of templates) {
        const nicho = t.nicho ? String(t.nicho).trim() : "";
        if (!nicho) continue;

        const originalIdea = t.originalIdea ? String(t.originalIdea).trim() : null;
        const proposedIdea = t.proposedIdea ? String(t.proposedIdea).trim() : null;
        const fullTemplate = t.fullTemplate ? String(t.fullTemplate).trim() : null;
        const views = t.views ? String(t.views).trim() : null;
        const videoLink = t.videoLink ? String(t.videoLink).trim() : null;
        const videoLinks = videoLink ? [videoLink] : [];

        // Set 'contenido' to fullTemplate, fallback to a basic placeholder
        const contenido = fullTemplate || `Content template for niche ${nicho}`;

        // Try inserting, handle composite unique constraint if any
        try {
          await client.query(
            `INSERT INTO content_templates (user_id, nicho, contenido, original_idea, proposed_idea, full_template, views, video_links)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (user_id, nicho) DO UPDATE
             SET contenido = EXCLUDED.contenido,
                 original_idea = EXCLUDED.original_idea,
                 proposed_idea = EXCLUDED.proposed_idea,
                 full_template = EXCLUDED.full_template,
                 views = EXCLUDED.views,
                 video_links = EXCLUDED.video_links`,
            [userId, nicho, contenido, originalIdea, proposedIdea, fullTemplate, views, videoLinks]
          );
        } catch (err: any) {
          console.error(`Error inserting template for nicho ${nicho}:`, err.message);
        }
      }
      console.log("Content templates inserted successfully.");
    } else {
      console.log("Content templates JSON file not found!");
    }

  } catch (err: any) {
    console.error("Migration error:", err);
  } finally {
    await client.end();
    console.log("Database connection closed.");
  }
}

main().catch(console.error);
