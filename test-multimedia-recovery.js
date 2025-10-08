const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testMultimediaRecovery() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 PRUEBA DE RECUPERACIÓN DE MULTIMEDIA DESDE FLOWISE\n');
    console.log('=' .repeat(60));

    // 1. OBTENER CONFIGURACIÓN DE FLOWISE DE LA INSTANCIA 1
    console.log('\n📋 1. OBTENIENDO CONFIGURACIÓN DE FLOWISE...\n');
    
    const instance = await prisma.chatProcessorInstance.findUnique({
      where: { instanceId: 1 },
      select: { 
        sourceConfig: true,
        mediaHandlingConfig: true,
        evolutionApiConfig: true,
        agents: {
          select: {
            id: true,
            config: true
          }
        }
      }
    });

    const flowiseConfig = instance.sourceConfig;
    console.log('🔧 Configuración Flowise:');
    console.log('  URL:', flowiseConfig.apiUrl);
    console.log('  Flow ID:', flowiseConfig.flowId);
    console.log('  API Key:', flowiseConfig.apiKey ? '***CONFIGURADO***' : 'NO CONFIGURADO');
    console.log('  Multimedia habilitado:', instance.mediaHandlingConfig?.enabled);

    // 2. BUSCAR CONVERSACIÓN CON MULTIMEDIA (búsqueda más amplia)
    console.log('\n💬 2. BUSCANDO CONVERSACIÓN CON MULTIMEDIA...\n');
    
    // Primero intentar con el flag hasMedia
    let conversationWithMedia = await prisma.importedConversation.findFirst({
      where: {
        instanceId: 1,
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

    if (!conversationWithMedia) {
      console.log('⚠️ No se encontró conversación con flag hasMedia, buscando en originalMessages...');
      
      // Buscar cualquier conversación reciente que tenga originalMessages
      const recentConversations = await prisma.importedConversation.findMany({
        where: {
          instanceId: 1,
          metadata: {
            path: ['originalMessages'],
            not: null
          }
        },
        select: {
          externalId: true,
          metadata: true,
          importedAt: true
        },
        orderBy: { importedAt: 'desc' },
        take: 10
      });

      console.log(`📋 Encontradas ${recentConversations.length} conversaciones recientes`);

      // Buscar una que tenga archivos multimedia
      for (const conv of recentConversations) {
        const messages = conv.metadata?.originalMessages || [];
        let hasFiles = false;
        
        for (const msg of messages) {
          if (msg.fileUploads && Array.isArray(msg.fileUploads) && msg.fileUploads.length > 0) {
            hasFiles = true;
            break;
          }
        }
        
        if (hasFiles) {
          conversationWithMedia = conv;
          console.log(`🎯 Encontrada conversación con archivos: ${conv.externalId}`);
          break;
        }
      }
    }

    if (!conversationWithMedia) {
      console.log('❌ No se encontró ninguna conversación con multimedia');
      
      // Mostrar información de debug
      console.log('\n🔍 DEBUG: Revisando conversaciones recientes...');
      const debugConversations = await prisma.importedConversation.findMany({
        where: { instanceId: 1 },
        select: {
          externalId: true,
          metadata: true,
          importedAt: true
        },
        orderBy: { importedAt: 'desc' },
        take: 3
      });

      for (const conv of debugConversations) {
        console.log(`📄 ${conv.externalId}:`);
        console.log(`  HasMedia flag: ${conv.metadata?.hasMedia}`);
        console.log(`  OriginalMessages: ${conv.metadata?.originalMessages?.length || 0} mensajes`);
        
        if (conv.metadata?.originalMessages) {
          let fileCount = 0;
          for (const msg of conv.metadata.originalMessages) {
            if (msg.fileUploads) fileCount += msg.fileUploads.length;
          }
          console.log(`  Archivos encontrados: ${fileCount}`);
        }
      }
      return;
    }

    console.log('🎬 Conversación encontrada:', conversationWithMedia.externalId);
    console.log('  Importada:', conversationWithMedia.importedAt.toLocaleString());
    console.log('  HasMedia flag:', conversationWithMedia.metadata?.hasMedia);

    // Analizar archivos en la conversación
    const messages = conversationWithMedia.metadata?.originalMessages || [];
    const filesFound = [];
    
    console.log(`📋 Analizando ${messages.length} mensajes...`);
    
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.fileUploads && Array.isArray(msg.fileUploads)) {
        for (const file of msg.fileUploads) {
          if (file.type === 'stored-file' && file.name && file.mime) {
            filesFound.push({
              name: file.name,
              mime: file.mime,
              messageIndex: i + 1,
              id: file.id
            });
          }
        }
      }
    }

    console.log('📎 Archivos detectados:', filesFound.length);
    filesFound.forEach((file, idx) => {
      console.log(`  ${idx + 1}. ${file.name} (${file.mime}) - Mensaje ${file.messageIndex}`);
    });

    if (filesFound.length === 0) {
      console.log('❌ No se encontraron archivos en la conversación');
      return;
    }

    // 3. PROBAR DESCARGA DIRECTA DESDE FLOWISE
    console.log('\n📥 3. PROBANDO DESCARGA DIRECTA DESDE FLOWISE...\n');

    const testFile = filesFound[0]; // Probar con el primer archivo
    console.log(`🎯 Probando descarga de: ${testFile.name}`);

    // Construir URL de descarga de Flowise
    const downloadUrl = `${flowiseConfig.apiUrl}/api/v1/get-upload-file?chatflowId=${flowiseConfig.flowId}&fileName=${testFile.name}`;
    
    console.log('🔗 URL de descarga:', downloadUrl);

    try {
      const response = await axios({
        method: 'GET',
        url: downloadUrl,
        headers: {
          'Authorization': `Bearer ${flowiseConfig.apiKey}`
        },
        responseType: 'arraybuffer',
        timeout: 30000,
        maxContentLength: 10 * 1024 * 1024, // 10MB
        maxBodyLength: 10 * 1024 * 1024
      });

      console.log('✅ Descarga exitosa!');
      console.log('  Status:', response.status);
      console.log('  Content-Type:', response.headers['content-type']);
      console.log('  Content-Length:', response.headers['content-length']);
      console.log('  Tamaño descargado:', response.data.length, 'bytes');

      // 4. GUARDAR ARCHIVO TEMPORALMENTE PARA VERIFICAR
      console.log('\n💾 4. GUARDANDO ARCHIVO PARA VERIFICACIÓN...\n');
      
      const tempDir = '/tmp/multimedia-test';
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFilePath = path.join(tempDir, testFile.name);
      fs.writeFileSync(tempFilePath, response.data);

      console.log('✅ Archivo guardado en:', tempFilePath);
      
      // Verificar archivo
      const stats = fs.statSync(tempFilePath);
      console.log('📊 Información del archivo:');
      console.log('  Tamaño:', stats.size, 'bytes');
      console.log('  MIME detectado:', testFile.mime);
      console.log('  Creado:', stats.birthtime.toLocaleString());

      // 5. PROBAR CON TODOS LOS ARCHIVOS
      console.log('\n🔄 5. PROBANDO CON TODOS LOS ARCHIVOS...\n');
      
      let successCount = 0;
      let failCount = 0;
      
      for (const file of filesFound) {
        try {
          const fileUrl = `${flowiseConfig.apiUrl}/api/v1/get-upload-file?chatflowId=${flowiseConfig.flowId}&fileName=${file.name}`;
          
          const fileResponse = await axios({
            method: 'GET',
            url: fileUrl,
            headers: {
              'Authorization': `Bearer ${flowiseConfig.apiKey}`
            },
            responseType: 'arraybuffer',
            timeout: 30000,
            maxContentLength: 10 * 1024 * 1024
          });

          const filePath = path.join(tempDir, file.name);
          fs.writeFileSync(filePath, fileResponse.data);
          
          console.log(`✅ ${file.name} - ${fileResponse.data.length} bytes`);
          successCount++;
          
        } catch (error) {
          console.log(`❌ ${file.name} - Error: ${error.message}`);
          failCount++;
        }
      }

      console.log('\n📊 RESUMEN DE DESCARGA:');
      console.log(`  Exitosas: ${successCount}`);
      console.log(`  Fallidas: ${failCount}`);
      console.log(`  Total: ${filesFound.length}`);

      // 6. PREPARAR DATOS PARA EVOLUTION API
      console.log('\n📤 6. PREPARANDO DATOS PARA EVOLUTION API...\n');
      
      const attachments = [];
      const tempFiles = fs.readdirSync(tempDir);
      
      for (const fileName of tempFiles) {
        const filePath = path.join(tempDir, fileName);
        const fileBuffer = fs.readFileSync(filePath);
        const fileInfo = filesFound.find(f => f.name === fileName);
        
        attachments.push({
          name: fileName,
          mime: fileInfo?.mime || 'application/octet-stream',
          buffer: fileBuffer,
          size: fileBuffer.length,
          url: filePath // Path local temporal
        });
      }

      console.log('📎 Attachments preparados:', attachments.length);
      attachments.forEach((att, idx) => {
        console.log(`  ${idx + 1}. ${att.name} (${att.mime}) - ${att.size} bytes`);
      });

      console.log('\n🎯 DATOS LISTOS PARA EVOLUTION API');
      console.log('Estructura de attachment:');
      console.log(JSON.stringify({
        name: attachments[0]?.name,
        mime: attachments[0]?.mime,
        size: attachments[0]?.size,
        hasBuffer: !!attachments[0]?.buffer,
        hasUrl: !!attachments[0]?.url
      }, null, 2));

      // 7. PRUEBA DIRECTA CON EVOLUTION API
      console.log('\n📱 7. PROBANDO ENVÍO A EVOLUTION API...\n');
      
      // Obtener configuración de Evolution API
      const evolutionConfig = instance.evolutionApiConfig;
      if (evolutionConfig && evolutionConfig.serverUrl && evolutionConfig.apiKey) {
        console.log('🔧 Configuración Evolution API encontrada');
        console.log('  URL:', evolutionConfig.serverUrl);
        console.log('  Instance:', evolutionConfig.instanceName);
        
        // Importar y probar Evolution API
        const { EvolutionApiService } = require('./apps/backend/src/services/evolution-api.service');
        
        const evolutionApi = new EvolutionApiService({
          serverUrl: evolutionConfig.serverUrl,
          apiKey: evolutionConfig.apiKey,
          instanceName: evolutionConfig.instanceName || 'default'
        });

        // Buscar un agente configurado
        const agents = instance.agents || [];
        if (agents.length > 0) {
          const testAgent = agents[0];
          console.log(`📞 Probando envío a agente: ${testAgent.config.name} (${testAgent.config.whatsappNumber})`);
          
          const testMessage = {
            conversationId: conversationWithMedia.externalId,
            phoneNumber: '1234567890',
            sentiment: 'positive',
            intent: 'test',
            confidence: 0.95,
            tags: ['test', 'multimedia'],
            analysisText: 'Prueba de envío de multimedia desde script de testing',
            timestamp: new Date(),
            attachments: attachments
          };

          try {
            const result = await evolutionApi.sendAnalysisWithMediaToAgent(
              testAgent.config.whatsappNumber,
              testMessage,
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
        } else {
          console.log('⚠️ No hay agentes configurados para probar');
        }
      } else {
        console.log('⚠️ Evolution API no está configurada');
      }

    } catch (error) {
      console.log('❌ Error en descarga:', error.message);
      if (error.response) {
        console.log('  Status:', error.response.status);
        console.log('  Status Text:', error.response.statusText);
        console.log('  Headers:', error.response.headers);
      }
    }

    console.log('\n' + '=' .repeat(60));
    console.log('✅ PRUEBA DE RECUPERACIÓN COMPLETADA');

  } catch (error) {
    console.error('❌ Error durante la prueba:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testMultimediaRecovery(); 