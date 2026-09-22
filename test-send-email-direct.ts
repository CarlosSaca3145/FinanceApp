import { sendEmail } from "./server/services/email";

(async () => {
  try {
    const result = await sendEmail({
      to: "ceo.hanktech@gmail.com",
      subject: "🎬 Video exclusivo para ti",
      htmlBody: `<div style="font-family: Arial, sans-serif; line-height: 1.5; color:#333;">
        <h2>¡Hola CEO!</h2>
        <p>Quería compartir contigo un video que he creado especialmente para tu marca. Creo que encajaría perfectamente con tus objetivos de marketing.</p>
        <p><a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank" style="color:#1a73e8; text-decoration:none;">Ver video ahora</a></p>
        <p>Quedo atento a tus comentarios.</p>
        <p>Saludos,<br/>Carlos Saca<br/>Saca Tech</p>
      </div>`,
      name: "Saca Tech",
      from: "c@saca.technology",
      // No userId needed for direct call
    });
    console.log("Result:", result);
  } catch (err) {
    console.error("Error sending email:", err);
  }
})();
