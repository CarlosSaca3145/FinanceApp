import Imap from "imap";
import { storage } from "../storage";

/**
 * Connects to the user's Gmail IMAP inbox and checks for replies from sent brand contacts.
 * Automatically updates brand statuses to "Responded" if a reply is detected.
 */
export async function syncIncomingReplies(userId: string): Promise<{ success: boolean; count: number; error?: string }> {
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;

  if (!emailUser || !emailPassword) {
    console.log("[IMAP] No email credentials found in environment. Skipping sync.");
    return { success: false, count: 0, error: "No email credentials configured" };
  }

  // 1. Get all brands where status is '✅ Enviado' (Sent) or '👀 Abierto' (Opened)
  const brands = await storage.getBrands(userId);
  const targetBrands = brands.filter(
    (b) => {
      const lower = (b.estado || "").toLowerCase();
      return lower.includes("enviado") || lower.includes("sent") || lower.includes("abierto") || lower.includes("opened");
    }
  );

  if (targetBrands.length === 0) {
    console.log("[IMAP] No pending sent/opened brands to track. Skipping sync.");
    return { success: true, count: 0 };
  }

  // Map brand email and alternative emails to brand object for fast lookup
  const brandEmailMap = new Map<string, typeof brands[0]>();
  for (const b of targetBrands) {
    brandEmailMap.set(b.correo.toLowerCase(), b);
    if (b.correos && Array.isArray(b.correos)) {
      for (const altEmail of b.correos) {
        brandEmailMap.set(altEmail.toLowerCase(), b);
      }
    }
  }

  // Calculate the oldest send date among target brands to set search boundary
  let oldestSendDate = new Date();
  oldestSendDate.setDate(oldestSendDate.getDate() - 7); // Default to 7 days ago

  for (const b of targetBrands) {
    if (b.fechaEnvio) {
      const sendDate = new Date(b.fechaEnvio);
      if (sendDate < oldestSendDate) {
        oldestSendDate = sendDate;
      }
    }
  }

  // Cap the search at 30 days ago to avoid loading excessive messages
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  if (oldestSendDate < thirtyDaysAgo) {
    oldestSendDate = thirtyDaysAgo;
  }

  console.log(`[IMAP] Syncing replies for ${targetBrands.length} brands since oldest send date: ${oldestSendDate.toLocaleString()}`);

  return new Promise((resolve) => {
    const imap = new Imap({
      user: emailUser,
      password: emailPassword,
      host: "imap.gmail.com",
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });

    let updatedCount = 0;

    imap.once("ready", () => {
      imap.openBox("INBOX", true, (err, box) => {
        if (err) {
          imap.end();
          return resolve({ success: false, count: 0, error: err.message });
        }

        // Search for messages received since our calculated oldest send date boundary
        imap.search([["SINCE", oldestSendDate]], (err, uids) => {
          if (err) {
            console.error("[IMAP] Search error:", err);
            imap.end();
            return resolve({ success: false, count: 0, error: err.message });
          }

          if (!uids || uids.length === 0) {
            console.log("[IMAP] No recent emails found in inbox since search date.");
            imap.end();
            return resolve({ success: true, count: 0 });
          }

          // Fetch only From and Date headers to keep it lightweight
          const f = imap.fetch(uids, {
            bodies: "HEADER.FIELDS (FROM DATE)",
            struct: false
          });

          const messagesToProcess: { from: string; date: Date }[] = [];

          f.on("message", (msg) => {
            let fromHeader = "";
            let dateHeader: Date | null = null;

            msg.on("body", (stream) => {
              let buffer = "";
              stream.on("data", (chunk) => {
                buffer += chunk.toString("utf8");
              });
              stream.once("end", () => {
                const lines = buffer.split("\r\n");
                for (const line of lines) {
                  if (line.toLowerCase().startsWith("from:")) {
                    fromHeader = line.substring(5).trim();
                  } else if (line.toLowerCase().startsWith("date:")) {
                    const dateStr = line.substring(5).trim();
                    try {
                      dateHeader = new Date(dateStr);
                    } catch (e) {
                      // Skip invalid date strings
                    }
                  }
                }
              });
            });

            msg.once("end", () => {
              // Extract clean email from "From: Sender Name <sender@domain.com>"
              const emailMatch = fromHeader.match(/<([^>]+)>/) || [null, fromHeader];
              const cleanFromEmail = (emailMatch[1] || fromHeader).trim().toLowerCase();
              if (cleanFromEmail && dateHeader) {
                messagesToProcess.push({ from: cleanFromEmail, date: dateHeader });
              }
            });
          });

          f.once("error", (fetchErr) => {
            console.error("[IMAP] Fetch messages error:", fetchErr);
          });

          f.once("end", async () => {
            imap.end();

            console.log(`[IMAP] Finished loading headers for ${messagesToProcess.length} emails. Scanning for matches...`);

            // Check matches and update database
            for (const msg of messagesToProcess) {
              const matchedBrand = brandEmailMap.get(msg.from);
              if (matchedBrand) {
                const sendDate = matchedBrand.fechaEnvio ? new Date(matchedBrand.fechaEnvio) : new Date(0);
                const replyDate = new Date(msg.date);
                
                // Allow a small 60 second clock discrepancy buffer
                if (replyDate.getTime() > sendDate.getTime() - 60000) {
                  console.log(`[IMAP] Match found! Brand "${matchedBrand.marca}" replied on ${replyDate.toLocaleString()}`);
                  
                  await storage.updateBrand(matchedBrand.id, userId, {
                    estado: "Responded"
                  });
                  updatedCount++;
                  
                  // Delete from map to avoid double updates for the same brand
                  brandEmailMap.delete(msg.from);
                }
              }
            }

            console.log(`[IMAP] Sync completed. Updated ${updatedCount} brands to 'Responded'.`);
            resolve({ success: true, count: updatedCount });
          });
        });
      });
    });

    imap.once("error", (err) => {
      console.error("[IMAP] Connection error:", err);
      resolve({ success: false, count: 0, error: err.message });
    });

    imap.connect();
  });
}
