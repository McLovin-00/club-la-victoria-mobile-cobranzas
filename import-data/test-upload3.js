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
  form.append('entityType', 'CHOFER');
  form.append('entityId', '111');
  form.append('templateId', '44');
  form.append('dadorCargaId', '1');
  form.append('document', fs.createReadStream('./documentos/ID2 - DIEGO ANGEL GALLARDO/LICENCIA NACIONAL DE CONDUCIR (frente y dorso).pdf'));
  
  console.log('1. Uploading...');
  const uploadRes = await axios.post(`${server.apiUrl}/documents/upload`, form, {
    headers: { 'Authorization': 'Bearer ' + token, ...form.getHeaders() },
    maxContentLength: Infinity, maxBodyLength: Infinity
  });
  console.log('   Doc ID:', uploadRes.data.id, '- Status:', uploadRes.data.status);
  
  console.log('2. Approving...');
  const approveRes = await axios.post(`${server.apiUrl}/approval/pending/${uploadRes.data.id}/approve`, {}, {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log('   Status:', approveRes.data.success ? 'APROBADO' : 'FAILED');
  console.log('   Doc nuevo status:', approveRes.data.data?.status || 'N/A');
}
test().catch(e => console.error('Error:', e.response?.data || e.message));
