import 'dotenv/config';
import { storage } from './server/storage';
import { sendEmail } from './server/services/email';
import { YouTubeService } from './server/services/youtube';
import { NotionService } from './server/services/notion';

async function main() {
  console.log('🔄 Iniciando prueba de integraciones...');

  const { users } = await import('./shared/schema');
  const userResult = (storage as any).db ? await (storage as any).db.select().from(users).limit(1) : [];
  if (!userResult || userResult.length === 0) {
    console.error('❌ No se encontró ningún usuario en la BD.');
    process.exit(1);
  }
  const userId = userResult[0].id;
  console.log(`✅ Usuario encontrado: ${userId}`);

  // 2. Set YouTube API key and channel Handle in the DB
  console.log('🔄 Actualizando claves de YouTube en la BD...');
  const config = await storage.upsertIntegrationsConfig(userId, {
    youtubeApiKey: 'AIzaSyAQRJuuZELoo3EVxGcA6AMJEysNaTB6DPQ',
    youtubeChannelId: '@saca.technology'
  });
  console.log('✅ Claves actualizadas en DB.');

  // 3. Test Email
  console.log('\n📧 Probando SMTP Email...');
  try {
    const emailRes = await sendEmail({
      to: 'c@saca.technology',
      subject: 'Prueba interna desde el script',
      htmlBody: 'Hola mundo, esto es una prueba automática',
      userId: userId
    });
    if (emailRes.success) {
      console.log('✅ Email enviado con éxito!');
    } else {
      console.error('❌ Error enviando email:', emailRes.error);
    }
  } catch (e: any) {
    console.error('❌ Excepción enviando email:', e.message);
  }

  // 4. Test YouTube
  console.log('\n▶️ Probando YouTube Sync...');
  try {
    if (config.youtubeApiKey && config.youtubeChannelId) {
      const yt = new YouTubeService(config.youtubeApiKey, config.youtubeChannelId);
      const videos = await yt.syncChannelVideos();
      console.log(`✅ YouTube OK: ${videos.length} videos encontrados.`);
    } else {
      console.error('❌ Faltan credenciales de YouTube.');
    }
  } catch (e: any) {
    console.error('❌ Error YouTube:', e.message);
  }

  // 5. Test Notion
  console.log('\n📝 Probando Notion Sync...');
  try {
    if (config.notionToken && config.notionDatabaseId) {
      const notion = new NotionService({
        token: config.notionToken,
        databaseId: config.notionDatabaseId,
        titleProperty: config.notionTitleProperty,
        dateProperty: config.notionDateProperty,
        statusProperty: config.notionStatusProperty,
        nicheProperty: config.notionNicheProperty
      });
      const pages = await notion.fetchUpcomingVideos();
      console.log(`✅ Notion OK: ${pages.length} páginas encontradas.`);
    } else {
      console.error('❌ Faltan credenciales de Notion.');
    }
  } catch (e: any) {
    console.error('❌ Error Notion:', e.message);
  }

  console.log('\n🏁 Pruebas finalizadas.');
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
