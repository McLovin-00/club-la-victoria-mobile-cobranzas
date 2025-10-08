const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

async function recoverConversationsFromFlowise() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 RECUPERANDO CONVERSACIONES DESDE FLOWISE\n');
    console.log('=' .repeat(50));

    // 1. OBTENER CONFIGURACIÓN DE FLOWISE
    console.log('\n📋 1. OBTENIENDO CONFIGURACIÓN...\n');
    
    const instance = await prisma.chatProcessorInstance.findUnique({
      where: { instanceId: 1 },
      select: { 
        id: true,
        instanceId: true,
        sourceConfig: true,
        conversationSource: true
      }
    });

    if (!instance) {
      console.log('❌ No se encontró la instancia 1');
      return;
    }

    const flowiseConfig = instance.sourceConfig;
    console.log('🔧 Configuración Flowise:');
    console.log('  URL:', flowiseConfig.apiUrl);
    console.log('  Flow ID:', flowiseConfig.flowId);
    console.log('  API Key:', flowiseConfig.apiKey ? '***CONFIGURADO***' : 'NO CONFIGURADO');

    // 2. HACER PETICIÓN A FLOWISE PARA OBTENER CONVERSACIONES
    console.log('\n📡 2. RECUPERANDO CONVERSACIONES DESDE FLOWISE...\n');
    
    const flowiseUrl = `${flowiseConfig.apiUrl}/api/v1/chatmessage/${flowiseConfig.flowId}`;
    console.log('🔗 URL de consulta:', flowiseUrl);

    try {
      const response = await axios({
        method: 'GET',
        url: flowiseUrl,
        headers: {
          'Authorization': `Bearer ${flowiseConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        params: {
          sort: 'DESC',
          startDate: '', // Sin filtro de fecha para obtener todo
          endDate: ''
        },
        timeout: 30000
      });

      console.log('✅ Respuesta de Flowise recibida');
      console.log('  Status:', response.status);
      console.log('  Total mensajes:', response.data.length);

      // 3. PROCESAR Y AGRUPAR MENSAJES POR CONVERSACIÓN
      console.log('\n🔄 3. PROCESANDO MENSAJES...\n');
      
      const messages = response.data;
      const conversationGroups = {};
      let totalFiles = 0;

      for (const message of messages) {
        const sessionId = message.sessionId || 'unknown';
        
        if (!conversationGroups[sessionId]) {
          conversationGroups[sessionId] = {
            sessionId: sessionId,
            messages: [],
            hasFiles: false,
            fileCount: 0
          };
        }
        
        conversationGroups[sessionId].messages.push(message);
        
        // Detectar archivos multimedia
        if (message.fileUploads && Array.isArray(message.fileUploads)) {
          for (const file of message.fileUploads) {
            if (file.type === 'stored-file' && file.name && file.mime) {
              conversationGroups[sessionId].hasFiles = true;
              conversationGroups[sessionId].fileCount++;
              totalFiles++;
            }
          }
        }
      }

      const conversationIds = Object.keys(conversationGroups);
      console.log('📊 Estadísticas de procesamiento:');
      console.log('  Total mensajes:', messages.length);
      console.log('  Total conversaciones:', conversationIds.length);
      console.log('  Total archivos multimedia:', totalFiles);

      // Mostrar conversaciones con multimedia
      const conversationsWithMedia = conversationIds.filter(id => conversationGroups[id].hasFiles);
      console.log('  Conversaciones con multimedia:', conversationsWithMedia.length);

      if (conversationsWithMedia.length > 0) {
        console.log('\n🎬 CONVERSACIONES CON MULTIMEDIA:');
        conversationsWithMedia.forEach((id, idx) => {
          const conv = conversationGroups[id];
          console.log(`  ${idx + 1}. ${id} - ${conv.fileCount} archivos (${conv.messages.length} mensajes)`);
        });
      }

      // 4. GUARDAR CONVERSACIONES EN LA BASE DE DATOS
      console.log('\n💾 4. GUARDANDO CONVERSACIONES EN LA BASE DE DATOS...\n');
      
      let savedCount = 0;
      let skippedCount = 0;
      
      for (const sessionId of conversationIds) {
        const convGroup = conversationGroups[sessionId];
        
        try {
          // Preparar metadata
          const metadata = {
            originalMessages: convGroup.messages,
            hasMedia: convGroup.hasFiles,
            fileCount: convGroup.fileCount,
            messageCount: convGroup.messages.length,
            recoveredAt: new Date().toISOString(),
            source: 'flowise_recovery'
          };

          // Determinar última fecha de mensaje
          const lastMessage = convGroup.messages.reduce((latest, msg) => {
            const msgDate = new Date(msg.createdDate);
            const latestDate = new Date(latest.createdDate);
            return msgDate > latestDate ? msg : latest;
          });

          const lastMessageAt = new Date(lastMessage.createdDate);

          // Crear conversación en la base de datos
          await prisma.importedConversation.upsert({
            where: {
              instanceId_externalId: {
                instanceId: instance.id,
                externalId: `flowise_${sessionId}`
              }
            },
            create: {
              externalId: `flowise_${sessionId}`,
              instanceId: instance.id,
              source: 'flowise',
              phoneNumber: null, // Flowise no proporciona número de teléfono
              content: JSON.stringify(convGroup.messages),
              metadata: metadata,
              lastMessageAt: lastMessageAt,
              processingStatus: 'pending',
              importedAt: new Date(),
              sourceTimestamp: lastMessageAt // Timestamp original de la fuente
            },
            update: {
              content: JSON.stringify(convGroup.messages),
              metadata: metadata,
              source: 'flowise',
              lastMessageAt: lastMessageAt,
              processingStatus: 'pending',
              importedAt: new Date(),
              sourceTimestamp: lastMessageAt // Timestamp original de la fuente
            }
          });

          savedCount++;
          
          if (convGroup.hasFiles) {
            console.log(`✅ ${sessionId} - ${convGroup.messages.length} mensajes, ${convGroup.fileCount} archivos`);
          }
          
        } catch (error) {
          console.log(`❌ Error guardando ${sessionId}:`, error.message);
          skippedCount++;
        }
      }

      console.log('\n📊 RESUMEN DE IMPORTACIÓN:');
      console.log(`  Conversaciones guardadas: ${savedCount}`);
      console.log(`  Conversaciones omitidas: ${skippedCount}`);
      console.log(`  Conversaciones con multimedia: ${conversationsWithMedia.length}`);
      
      // 5. VERIFICAR CONVERSACIONES CON MULTIMEDIA
      console.log('\n🔍 5. VERIFICANDO CONVERSACIONES CON MULTIMEDIA...\n');
      
      const importedWithMedia = await prisma.importedConversation.findMany({
        where: {
          instanceId: instance.id,
          metadata: {
            path: ['hasMedia'],
            equals: true
          }
        },
        select: {
          externalId: true,
          metadata: true,
          importedAt: true
        },
        orderBy: { importedAt: 'desc' }
      });

      console.log(`✅ Conversaciones con multimedia en BD: ${importedWithMedia.length}`);
      
      if (importedWithMedia.length > 0) {
        console.log('\n📋 LISTA DE CONVERSACIONES CON MULTIMEDIA:');
        importedWithMedia.forEach((conv, idx) => {
          console.log(`  ${idx + 1}. ${conv.externalId}`);
          console.log(`     Archivos: ${conv.metadata.fileCount || 0}`);
          console.log(`     Mensajes: ${conv.metadata.messageCount || 0}`);
          console.log(`     Importada: ${conv.importedAt.toLocaleString()}`);
          console.log('');
        });
      }

    } catch (error) {
      console.log('❌ Error consultando Flowise:', error.message);
      if (error.response) {
        console.log('  Status:', error.response.status);
        console.log('  Status Text:', error.response.statusText);
        if (error.response.data) {
          console.log('  Response:', JSON.stringify(error.response.data, null, 2));
        }
      }
    }

    console.log('\n' + '=' .repeat(50));
    console.log('✅ RECUPERACIÓN COMPLETADA');

  } catch (error) {
    console.error('❌ Error durante recuperación:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

recoverConversationsFromFlowise(); 