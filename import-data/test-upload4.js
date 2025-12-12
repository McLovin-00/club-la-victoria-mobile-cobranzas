const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

const server = { apiUrl: 'http://10.3.0.243:4802/api/docs' };

async function test() {
  const loginRes = await axios.post('http://10.3.0.243:4800/api/platform/auth/login', {
    email: 'admin.interno@bca.com', password: 'Test1234'
  });
  const token = loginRes.data.token;
  console.log('Token OK');
  
  const form = new FormData();
  const entityType = 'CHOFER';
  const entityId = 111;
  const templateId = 46; // Seguro de Vida
  
  form.append('entityType', entityType);
  form.append('entityId', String(entityId));
  form.append('templateId', String(templateId));
  form.append('dadorCargaId', '1');
  form.append('document', fs.createReadStream('./documentos/ID2 - DIEGO ANGEL GALLARDO/PÓLIZA DE SEGURO DE VIDA OBLIGATORIO.pdf'));
  
  console.log('1. Uploading...');
  const uploadRes = await axios.post(`${server.apiUrl}/documents/upload`, form, {
    headers: { 'Authorization': 'Bearer ' + token, ...form.getHeaders() },
    maxContentLength: Infinity, maxBodyLength: Infinity
  });
  console.log('   Doc ID:', uploadRes.data.id, '- Status:', uploadRes.data.status);
  
  const expirationDate = new Date();
  expirationDate.setFullYear(expirationDate.getFullYear() + 1);
  
  console.log('2. Approving...');
  const approveRes = await axios.post(`${server.apiUrl}/approval/pending/${uploadRes.data.id}/approve`, {
    confirmedEntityType: entityType,
    confirmedEntityId: entityId,
    confirmedExpiration: expirationDate.toISOString(),
    confirmedTemplateId: templateId,
  }, {
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
  });
  console.log('   Status:', approveRes.data.success ? 'APROBADO' : 'FAILED');
  console.log('   Doc nuevo status:', approveRes.data.data?.status || 'N/A');
}
test().catch(e => console.error('Error:', e.response?.data || e.message));
