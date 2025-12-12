const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function test() {
  // Login
  const loginRes = await axios.post('http://10.3.0.243:4800/api/platform/auth/login', {
    email: 'admin.interno@bca.com',
    password: 'Test1234'
  });
  const token = loginRes.data.token;
  console.log('Token OK');
  
  // Upload de prueba
  const form = new FormData();
  form.append('entityType', 'CHOFER');
  form.append('entityId', '111');
  form.append('templateName', 'DNI (frente y dorso)');
  form.append('dadorCargaId', '1');
  form.append('document', fs.createReadStream('./documentos/ID2 - DIEGO ANGEL GALLARDO/DNI (frente y dorso).pdf'));
  
  console.log('Uploading with axios...');
  const res = await axios.post('http://10.3.0.243:4802/api/docs/documents/upload', form, {
    headers: {
      'Authorization': 'Bearer ' + token,
      ...form.getHeaders()
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  });
  
  console.log('Status:', res.status);
  console.log('Response:', JSON.stringify(res.data, null, 2));
}
test().catch(e => console.error('Error:', e.response?.data || e.message));
