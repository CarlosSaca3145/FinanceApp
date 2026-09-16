import pg from "pg";

const databaseUrl = "postgresql://neondb_owner:npg_N1RMyjtKoL2Y@ep-restless-fog-aqkiyb35.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require";

async function main() {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  
  const tables = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
  );
  console.log("Tables in public schema:");
  console.log(tables.rows.map((t: any) => t.table_name));
  
  const tablesToCheck = ['users', 'brands', 'content_templates', 'followup_templates', 'email_logs'];
  for (const table of tablesToCheck) {
    try {
      const result = await client.query(`SELECT COUNT(*) as count FROM "${table}"`);
      console.log(`Table "${table}" row count:`, result.rows[0].count);
    } catch (e: any) {
      console.log(`Table "${table}" check error:`, e.message);
    }
  }

  // Check sample users
  try {
    const usersResult = await client.query("SELECT id, email, first_name FROM users");
    console.log("Users in DB:", usersResult.rows);
  } catch (e: any) {
    console.log("Users query error:", e.message);
  }

  // Check sample brands
  try {
    const brandsResult = await client.query("SELECT * FROM brands LIMIT 5");
    console.log("Sample Brands:", brandsResult.rows);
  } catch (e: any) {
    console.log("Brands query error:", e.message);
  }
  
  await client.end();
}

main().catch(console.error);
