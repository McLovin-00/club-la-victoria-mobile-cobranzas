const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

const server = {
  apiUrl: 'http://10.3.0.243:4802/api/docs',
  authUrl: 'http://10.3.0.243:4800/api/platform',
  templates: {
    'DNI (frente y dorso)': 43,
    'Constancia de Inscripción en ARCA': 69,
  }
};

async function test() {
  // Login
  const loginRes = await axios.post(`${server.authUrl}/auth/login`, {
    email: 'admin.interno@bca.com', password: 'Test1234'
  });
  const token = loginRes.data.token;
  console.log('✅ Token OK');
  
  // Crear equipo
  console.log('\n1. Creando equipo de prueba...');
  const equipoRes = await axios.post(`${server.apiUrl}/equipos/alta-completa`, {
    dadorCargaId: 1,
    empresaTransportistaCuit: '88888888888',
    empresaTransportistaNombre: 'TEST FULL FLOW',
    choferDni: '88888888',
    choferNombre: 'TEST',
    choferApellido: 'FLOW',
    camionPatente: 'TEST888',
    clienteIds: [68, 8]
  }, {
    headers: { 'Authorization': 'Bearer ' + token, 'X-Tenant-Id': '1' }
  });
  const equipo = equipoRes.data.data;
  console.log('   Equipo ID:', equipo.id);
  console.log('   Empresa ID:', equipo.empresaTransportistaId);
  console.log('   Chofer ID:', equipo.driverId);
  console.log('   Camion ID:', equipo.truckId);
  
  // Subir y aprobar DNI
  console.log('\n2. Subiendo DNI...');
  const form1 = new FormData();
  form1.append('entityType', 'CHOFER');
  form1.append('entityId', String(equipo.driverId));
  form1.append('templateId', '43');
  form1.append('dadorCargaId', '1');
  form1.append('document', fs.createReadStream('./documentos/ID2 - DIEGO ANGEL GALLARDO/DNI (frente y dorso).pdf'));
  
  const uploadRes = await axios.post(`${server.apiUrl}/documents/upload`, form1, {
    headers: { 'Authorization': 'Bearer ' + token, 'X-Tenant-Id': '1', ...form1.getHeaders() },
    maxContentLength: Infinity, maxBodyLength: Infinity
  });
  console.log('   Doc ID:', uploadRes.data.id, '- Status:', uploadRes.data.status);
  
  // Aprobar
  console.log('   Aprobando...');
  const approveRes = await axios.post(`${server.apiUrl}/approval/pending/batch-approve`, {
    ids: [uploadRes.data.id],
    overrides: {
      confirmedEntityType: 'CHOFER',
      confirmedEntityId: equipo.driverId,
      confirmedExpiration: new Date(Date.now() + 365*24*60*60*1000).toISOString(),
    }
  }, {
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'X-Tenant-Id': '1' }
  });
  console.log('   Aprobado:', approveRes.data.approved === 1 ? 'SÍ' : 'NO');
  
  console.log('\n✅ FLUJO COMPLETO OK');
}
test().catch(e => {
  console.error('Error:', e.response?.data || e.message);
  process.exit(1);
});
