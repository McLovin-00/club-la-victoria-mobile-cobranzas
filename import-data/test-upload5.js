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
  const templateId = 45; // ART
  
  form.append('entityType', entityType);
  form.append('entityId', String(entityId));
  form.append('templateId', String(templateId));
  form.append('dadorCargaId', '1');
  form.append('document', fs.createReadStream('./documentos/ID2 - DIEGO ANGEL GALLARDO/ALTA TEMPRANA EN ARCA ó CONSTANCIA DE INSCRIPCIÓN EN ARCA.pdf'));
  
  console.log('1. Uploading...');
  const uploadRes = await axios.post(`${server.apiUrl}/documents/upload`, form, {
    headers: { 
      'Authorization': 'Bearer ' + token, 
      'X-Tenant-Id': '1',
      ...form.getHeaders() 
    },
    maxContentLength: Infinity, maxBodyLength: Infinity
  });
  console.log('   Doc ID:', uploadRes.data.id, '- Status:', uploadRes.data.status);
  
  const expirationDate = new Date();
  expirationDate.setFullYear(expirationDate.getFullYear() + 1);
  
  console.log('2. Approving con X-Tenant-Id...');
  const approveRes = await axios.post(`${server.apiUrl}/approval/pending/${uploadRes.data.id}/approve`, {
    confirmedEntityType: entityType,
    confirmedEntityId: entityId,
    confirmedExpiration: expirationDate.toISOString(),
    confirmedTemplateId: templateId,
  }, {
    headers: { 
      'Authorization': 'Bearer ' + token, 
      'Content-Type': 'application/json',
      'X-Tenant-Id': '1'
    }
  });
  console.log('   Status:', approveRes.data.success ? 'APROBADO' : 'FAILED');
}
test().catch(e => console.error('Error:', e.response?.data || e.message));
