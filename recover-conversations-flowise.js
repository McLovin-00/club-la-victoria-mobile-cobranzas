const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

// ============= HELPERS =============

async function getInstanceConfig(prisma) {
  return prisma.chatProcessorInstance.findUnique({
    where: { instanceId: 1 },
    select: { id: true, instanceId: true, sourceConfig: true, conversationSource: true }
  });
}

function logConfig(config) {
  console.log('🔧 Configuración Flowise:');
  console.log('  URL:', config.apiUrl);
  console.log('  Flow ID:', config.flowId);
  console.log('  API Key:', config.apiKey ? '***CONFIGURADO***' : 'NO CONFIGURADO');
}

async function fetchFlowiseMessages(config) {
  const url = `${config.apiUrl}/api/v1/chatmessage/${config.flowId}`;
  console.log('🔗 URL de consulta:', url);

  const response = await axios({
    method: 'GET',
    url,
    headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
    params: { sort: 'DESC', startDate: '', endDate: '' },
    timeout: 30000
  });

  console.log('✅ Respuesta de Flowise recibida');
  console.log('  Status:', response.status);
  console.log('  Total mensajes:', response.data.length);

  return response.data;
}

function countFilesInMessage(message) {
  if (!message.fileUploads || !Array.isArray(message.fileUploads)) return 0;
  return message.fileUploads.filter(f => f.type === 'stored-file' && f.name && f.mime).length;
}

function groupMessagesByConversation(messages) {
  const groups = {};
  let totalFiles = 0;

  for (const message of messages) {
    const sessionId = message.sessionId || 'unknown';
    
    if (!groups[sessionId]) {
      groups[sessionId] = { sessionId, messages: [], hasFiles: false, fileCount: 0 };
    }
    
    groups[sessionId].messages.push(message);
    
    const fileCount = countFilesInMessage(message);
    if (fileCount > 0) {
      groups[sessionId].hasFiles = true;
      groups[sessionId].fileCount += fileCount;
      totalFiles += fileCount;
    }
  }

  return { groups, totalFiles };
}

function buildConversationMetadata(convGroup) {
  return {
    originalMessages: convGroup.messages,
    hasMedia: convGroup.hasFiles,
    fileCount: convGroup.fileCount,
    messageCount: convGroup.messages.length,
    recoveredAt: new Date().toISOString(),
    source: 'flowise_recovery'
  };
}

function getLastMessageDate(messages) {
  const lastMessage = messages.reduce((latest, msg) => {
    const msgDate = new Date(msg.createdDate);
    const latestDate = new Date(latest.createdDate);
    return msgDate > latestDate ? msg : latest;
  });
  return new Date(lastMessage.createdDate);
}

async function saveConversation(prisma, instanceId, sessionId, convGroup) {
  const metadata = buildConversationMetadata(convGroup);
  const lastMessageAt = getLastMessageDate(convGroup.messages);

  await prisma.importedConversation.upsert({
    where: { instanceId_externalId: { instanceId, externalId: `flowise_${sessionId}` } },
    create: {
      externalId: `flowise_${sessionId}`,
      instanceId,
      source: 'flowise',
      phoneNumber: null,
      content: JSON.stringify(convGroup.messages),
      metadata,
      lastMessageAt,
      processingStatus: 'pending',
      importedAt: new Date(),
      sourceTimestamp: lastMessageAt
    },
    update: {
      content: JSON.stringify(convGroup.messages),
      metadata,
      source: 'flowise',
      lastMessageAt,
      processingStatus: 'pending',
      importedAt: new Date(),
      sourceTimestamp: lastMessageAt
    }
  });
}

async function saveAllConversations(prisma, instanceId, groups) {
  const sessionIds = Object.keys(groups);
  let savedCount = 0;
  let skippedCount = 0;

  for (const sessionId of sessionIds) {
    const convGroup = groups[sessionId];
    try {
      await saveConversation(prisma, instanceId, sessionId, convGroup);
      savedCount++;
      if (convGroup.hasFiles) {
        console.log(`✅ ${sessionId} - ${convGroup.messages.length} mensajes, ${convGroup.fileCount} archivos`);
      }
    } catch (error) {
      console.log(`❌ Error guardando ${sessionId}:`, error.message);
      skippedCount++;
    }
  }

  return { savedCount, skippedCount };
}

async function verifyImportedMedia(prisma, instanceId) {
  const imported = await prisma.importedConversation.findMany({
    where: { instanceId, metadata: { path: ['hasMedia'], equals: true } },
    select: { externalId: true, metadata: true, importedAt: true },
    orderBy: { importedAt: 'desc' }
  });

  console.log(`✅ Conversaciones con multimedia en BD: ${imported.length}`);
  
  if (imported.length > 0) {
    console.log('\n📋 LISTA DE CONVERSACIONES CON MULTIMEDIA:');
    imported.forEach((conv, idx) => {
      console.log(`  ${idx + 1}. ${conv.externalId}`);
      console.log(`     Archivos: ${conv.metadata.fileCount || 0}`);
      console.log(`     Mensajes: ${conv.metadata.messageCount || 0}`);
    });
  }
}

// ============= MAIN =============

async function recoverConversationsFromFlowise() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 RECUPERANDO CONVERSACIONES DESDE FLOWISE\n');
    console.log('='.repeat(50));

    // 1. Obtener configuración
    console.log('\n📋 1. OBTENIENDO CONFIGURACIÓN...\n');
    const instance = await getInstanceConfig(prisma);

    if (!instance) {
      console.log('❌ No se encontró la instancia 1');
      return;
    }

    logConfig(instance.sourceConfig);

    // 2. Recuperar mensajes de Flowise
    console.log('\n📡 2. RECUPERANDO CONVERSACIONES DESDE FLOWISE...\n');
    
    try {
      const messages = await fetchFlowiseMessages(instance.sourceConfig);

      // 3. Procesar y agrupar mensajes
      console.log('\n🔄 3. PROCESANDO MENSAJES...\n');
      const { groups, totalFiles } = groupMessagesByConversation(messages);
      const sessionIds = Object.keys(groups);
      const withMedia = sessionIds.filter(id => groups[id].hasFiles);

      console.log('📊 Estadísticas:');
      console.log('  Total mensajes:', messages.length);
      console.log('  Total conversaciones:', sessionIds.length);
      console.log('  Total archivos multimedia:', totalFiles);
      console.log('  Conversaciones con multimedia:', withMedia.length);

      if (withMedia.length > 0) {
        console.log('\n🎬 CONVERSACIONES CON MULTIMEDIA:');
        withMedia.forEach((id, idx) => {
          const conv = groups[id];
          console.log(`  ${idx + 1}. ${id} - ${conv.fileCount} archivos`);
        });
      }

      // 4. Guardar en BD
      console.log('\n💾 4. GUARDANDO CONVERSACIONES EN LA BASE DE DATOS...\n');
      const { savedCount, skippedCount } = await saveAllConversations(prisma, instance.id, groups);

      console.log('\n📊 RESUMEN DE IMPORTACIÓN:');
      console.log(`  Guardadas: ${savedCount}, Omitidas: ${skippedCount}`);

      // 5. Verificar
      console.log('\n🔍 5. VERIFICANDO CONVERSACIONES CON MULTIMEDIA...\n');
      await verifyImportedMedia(prisma, instance.id);

    } catch (error) {
      console.log('❌ Error consultando Flowise:', error.message);
      if (error.response) {
        console.log('  Status:', error.response.status);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ RECUPERACIÓN COMPLETADA');

  } catch (error) {
    console.error('❌ Error durante recuperación:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

recoverConversationsFromFlowise();
