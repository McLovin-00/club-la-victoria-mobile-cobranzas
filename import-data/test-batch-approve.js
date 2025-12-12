const axios = require('axios');

async function test() {
  const loginRes = await axios.post('http://10.3.0.243:4800/api/platform/auth/login', {
    email: 'admin.interno@bca.com', password: 'Test1234'
  });
  const token = loginRes.data.token;
  console.log('Token OK');
  
  console.log('Batch approving doc 184...');
  const approveRes = await axios.post('http://10.3.0.243:4802/api/docs/approval/pending/batch-approve', {
    ids: [184],
    overrides: {
      confirmedEntityType: 'CHOFER',
      confirmedEntityId: 111,
      confirmedExpiration: new Date(Date.now() + 365*24*60*60*1000).toISOString(),
    }
  }, {
    headers: { 
      'Authorization': 'Bearer ' + token, 
      'Content-Type': 'application/json',
      'X-Tenant-Id': '1'
    }
  });
  console.log('Resultado:', JSON.stringify(approveRes.data, null, 2));
}
test().catch(e => console.error('Error:', e.response?.data || e.message));
