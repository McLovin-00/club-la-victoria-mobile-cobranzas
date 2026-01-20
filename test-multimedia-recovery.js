const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const TEMP_DIR = '/tmp/multimedia-test';

// ============= HELPERS =============

async function getFlowiseConfig(prisma) {
  const instance = await prisma.chatProcessorInstance.findUnique({
    where: { instanceId: 1 },
    select: { 
      sourceConfig: true,
      mediaHandlingConfig: true,
      evolutionApiConfig: true,
      agents: { select: { id: true, config: true } }
    }
  });
  return instance;
}

function logFlowiseConfig(config, mediaConfig) {
  console.log('🔧 Configuración Flowise:');
  console.log('  URL:', config.apiUrl);
  console.log('  Flow ID:', config.flowId);
  console.log('  API Key:', config.apiKey ? '***CONFIGURADO***' : 'NO CONFIGURADO');
  console.log('  Multimedia habilitado:', mediaConfig?.enabled);
}

async function findConversationWithMedia(prisma) {
  // Intentar con flag hasMedia
  let conv = await prisma.importedConversation.findFirst({
    where: { instanceId: 1, metadata: { path: ['hasMedia'], equals: true } },
    select: { externalId: true, metadata: true, importedAt: true },
    orderBy: { importedAt: 'desc' }
  });
  
  if (conv) return conv;
  
  console.log('⚠️ No se encontró conversación con flag hasMedia, buscando en originalMessages...');
  
  const recent = await prisma.importedConversation.findMany({
    where: { instanceId: 1, metadata: { path: ['originalMessages'], not: null } },
    select: { externalId: true, metadata: true, importedAt: true },
    orderBy: { importedAt: 'desc' },
    take: 10
  });

  console.log(`📋 Encontradas ${recent.length} conversaciones recientes`);

  for (const c of recent) {
    const messages = c.metadata?.originalMessages || [];
    const hasFiles = messages.some(m => m.fileUploads?.length > 0);
    if (hasFiles) {
      console.log(`🎯 Encontrada conversación con archivos: ${c.externalId}`);
      return c;
    }
  }
  
  return null;
}

async function debugConversations(prisma) {
  console.log('\n🔍 DEBUG: Revisando conversaciones recientes...');
  const convs = await prisma.importedConversation.findMany({
    where: { instanceId: 1 },
    select: { externalId: true, metadata: true, importedAt: true },
    orderBy: { importedAt: 'desc' },
    take: 3
  });

  for (const conv of convs) {
    console.log(`📄 ${conv.externalId}:`);
    console.log(`  HasMedia flag: ${conv.metadata?.hasMedia}`);
    console.log(`  OriginalMessages: ${conv.metadata?.originalMessages?.length || 0} mensajes`);
    
    const fileCount = (conv.metadata?.originalMessages || [])
      .reduce((sum, m) => sum + (m.fileUploads?.length || 0), 0);
    console.log(`  Archivos encontrados: ${fileCount}`);
  }
}

function extractFilesFromConversation(conv) {
  const messages = conv.metadata?.originalMessages || [];
  const files = [];
  
  console.log(`📋 Analizando ${messages.length} mensajes...`);
  
  for (let i = 0; i < messages.length; i++) {
    const uploads = messages[i].fileUploads || [];
    for (const file of uploads) {
      if (file.type === 'stored-file' && file.name && file.mime) {
        files.push({ name: file.name, mime: file.mime, messageIndex: i + 1, id: file.id });
      }
    }
  }
  
  return files;
}

async function downloadFile(flowiseConfig, fileName) {
  const url = `${flowiseConfig.apiUrl}/api/v1/get-upload-file?chatflowId=${flowiseConfig.flowId}&fileName=${fileName}`;
  
  const response = await axios({
    method: 'GET',
    url,
    headers: { 'Authorization': `Bearer ${flowiseConfig.apiKey}` },
    responseType: 'arraybuffer',
    timeout: 30000,
    maxContentLength: 10 * 1024 * 1024
  });
  
  return response;
}

function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

async function downloadAllFiles(flowiseConfig, filesFound) {
  let successCount = 0;
  let failCount = 0;
  
  for (const file of filesFound) {
    try {
      const response = await downloadFile(flowiseConfig, file.name);
      fs.writeFileSync(path.join(TEMP_DIR, file.name), response.data);
      console.log(`✅ ${file.name} - ${response.data.length} bytes`);
      successCount++;
    } catch (error) {
      console.log(`❌ ${file.name} - Error: ${error.message}`);
      failCount++;
    }
  }
  
  return { successCount, failCount };
}

function prepareAttachments(filesFound) {
  const attachments = [];
  const tempFiles = fs.readdirSync(TEMP_DIR);
  
  for (const fileName of tempFiles) {
    const filePath = path.join(TEMP_DIR, fileName);
    const fileBuffer = fs.readFileSync(filePath);
    const fileInfo = filesFound.find(f => f.name === fileName);
    
    attachments.push({
      name: fileName,
      mime: fileInfo?.mime || 'application/octet-stream',
      buffer: fileBuffer,
      size: fileBuffer.length,
      url: filePath
    });
  }
  
  return attachments;
}

async function testEvolutionApi(instance, conversationId, attachments) {
  const evolutionConfig = instance.evolutionApiConfig;
  
  if (!evolutionConfig?.serverUrl || !evolutionConfig?.apiKey) {
    console.log('⚠️ Evolution API no está configurada');
    return;
  }
  
  console.log('🔧 Configuración Evolution API encontrada');
  console.log('  URL:', evolutionConfig.serverUrl);
  console.log('  Instance:', evolutionConfig.instanceName);
  
  const agents = instance.agents || [];
  if (agents.length === 0) {
    console.log('⚠️ No hay agentes configurados para probar');
    return;
  }

  const { EvolutionApiService } = require('./apps/backend/src/services/evolution-api.service');
  
  const evolutionApi = new EvolutionApiService({
    serverUrl: evolutionConfig.serverUrl,
    apiKey: evolutionConfig.apiKey,
    instanceName: evolutionConfig.instanceName || 'default'
  });

  const testAgent = agents[0];
  console.log(`📞 Probando envío a agente: ${testAgent.config.name} (${testAgent.config.whatsappNumber})`);
  
  try {
    const result = await evolutionApi.sendAnalysisWithMediaToAgent(
      testAgent.config.whatsappNumber,
      {
        conversationId,
        phoneNumber: '1234567890',
        sentiment: 'positive',
        intent: 'test',
        confidence: 0.95,
        tags: ['test', 'multimedia'],
        analysisText: 'Prueba de envío de multimedia desde script de testing',
        timestamp: new Date(),
        attachments
      },
      testAgent.config.name
    );

    if (result.success) {
      console.log('✅ Mensaje con multimedia enviado exitosamente!');
      console.log('  Message ID:', result.messageId);
    } else {
      console.log('❌ Error enviando mensaje:', result.error);
    }
  } catch (error) {
    console.log('❌ Error en Evolution API:', error.message);
  }
}

// ============= MAIN =============

async function testMultimediaRecovery() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 PRUEBA DE RECUPERACIÓN DE MULTIMEDIA DESDE FLOWISE\n');
    console.log('='.repeat(60));

    // 1. Obtener configuración
    console.log('\n📋 1. OBTENIENDO CONFIGURACIÓN DE FLOWISE...\n');
    const instance = await getFlowiseConfig(prisma);
    const flowiseConfig = instance.sourceConfig;
    logFlowiseConfig(flowiseConfig, instance.mediaHandlingConfig);

    // 2. Buscar conversación con multimedia
    console.log('\n💬 2. BUSCANDO CONVERSACIÓN CON MULTIMEDIA...\n');
    const conversationWithMedia = await findConversationWithMedia(prisma);
    
    if (!conversationWithMedia) {
      console.log('❌ No se encontró ninguna conversación con multimedia');
      await debugConversations(prisma);
      return;
    }

    console.log('🎬 Conversación encontrada:', conversationWithMedia.externalId);
    console.log('  Importada:', conversationWithMedia.importedAt.toLocaleString());

    // Extraer archivos
    const filesFound = extractFilesFromConversation(conversationWithMedia);
    console.log('📎 Archivos detectados:', filesFound.length);
    filesFound.forEach((f, i) => console.log(`  ${i + 1}. ${f.name} (${f.mime})`));

    if (filesFound.length === 0) {
      console.log('❌ No se encontraron archivos en la conversación');
      return;
    }

    // 3. Probar descarga
    console.log('\n📥 3. PROBANDO DESCARGA DIRECTA DESDE FLOWISE...\n');
    ensureTempDir();
    
    const testFile = filesFound[0];
    console.log(`🎯 Probando descarga de: ${testFile.name}`);
    
    try {
      const response = await downloadFile(flowiseConfig, testFile.name);
      console.log('✅ Descarga exitosa!');
      console.log('  Status:', response.status);
      console.log('  Tamaño:', response.data.length, 'bytes');
      
      fs.writeFileSync(path.join(TEMP_DIR, testFile.name), response.data);
      console.log('💾 Archivo guardado en:', path.join(TEMP_DIR, testFile.name));

      // 4. Descargar todos los archivos
      console.log('\n🔄 4. DESCARGANDO TODOS LOS ARCHIVOS...\n');
      const { successCount, failCount } = await downloadAllFiles(flowiseConfig, filesFound);
      
      console.log('\n📊 RESUMEN:', `${successCount} exitosas, ${failCount} fallidas`);

      // 5. Preparar attachments
      console.log('\n📤 5. PREPARANDO DATOS PARA EVOLUTION API...\n');
      const attachments = prepareAttachments(filesFound);
      console.log('📎 Attachments preparados:', attachments.length);

      // 6. Probar Evolution API
      console.log('\n📱 6. PROBANDO ENVÍO A EVOLUTION API...\n');
      await testEvolutionApi(instance, conversationWithMedia.externalId, attachments);

    } catch (error) {
      console.log('❌ Error en descarga:', error.message);
      if (error.response) {
        console.log('  Status:', error.response.status);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ PRUEBA DE RECUPERACIÓN COMPLETADA');

  } catch (error) {
    console.error('❌ Error durante la prueba:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testMultimediaRecovery();
