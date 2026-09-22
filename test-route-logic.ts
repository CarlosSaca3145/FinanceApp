import 'dotenv/config';
import { storage } from './server/storage';
import { eq } from 'drizzle-orm';

async function run() {
  console.log("Testing exact proposal send-email flow...");
  const { users, brands } = await import('./shared/schema');
  const userResult = await (storage as any).db.select().from(users).limit(1);
  const userId = userResult[0].id;

  const brandResult = await (storage as any).db.select().from(brands).where(eq(brands.userId, userId)).limit(1);
  let brandId = "";
  if (brandResult.length > 0) {
    brandId = brandResult[0].id;
    console.log("Using existing brand:", brandResult[0].marca, brandResult[0].id);
  } else {
    const newBrand = await storage.createBrand(userId, {
      marca: "SacaTech",
      correo: "ceo.hanktech@gmail.com",
      nicho: "Tech",
      contacto: "Carlos Saca"
    });
    brandId = newBrand.id;
    console.log("Created test brand:", brandId);
  }

  const { sendEmail } = await import('./server/services/email');
  
  const subjectOverride = "Collaboration Opportunity — SacaTech | Probé el iPhone 18/Fold - Unboxing y primeras impresiones";
  const htmlOverride = "<p>This is a test proposal email with UTF-8 characters: Probé el iPhone 18/Fold.</p>";
  const recipient = "ceo.hanktech@gmail.com";

  console.log("Sending email...");
  const emailResult = await sendEmail({
    to: recipient,
    subject: subjectOverride,
    htmlBody: htmlOverride,
    name: "Saca Tech",
    from: "c@saca.technology",
    userId,
  });

  console.log("Email Result:", emailResult);

  if (emailResult.success) {
    console.log("Updating brand status...");
    const updatedBrand = await storage.updateBrand(brandId, userId, {
      estado: "✅ Enviado",
      fechaEnvio: new Date(),
    });
    console.log("Brand updated successfully:", updatedBrand?.estado);

    console.log("Creating email log...");
    const log = await storage.createEmailLog(userId, {
      brandId,
      recipient,
      subject: subjectOverride,
      htmlBody: htmlOverride,
      status: "sent"
    });
    console.log("Email Log created successfully:", log.id);
  }
}

run().catch(console.error);
