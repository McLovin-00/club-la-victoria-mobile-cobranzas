const express = require('express');
const cors = require('cors');

const app = express();
const port = 4803;

// Middleware
app.use(cors());
app.use(express.json());

// Simple auth middleware
const authenticate = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token de autenticación requerido', code: 'MISSING_TOKEN' });
  }
  // Skip validation for now, just pass through
  req.user = { role: 'SUPERADMIN', empresaId: 1 };
  req.tenantId = 1;
  next();
};

// Health check
app.get('/health', (req, res) => {
  res.json({ service: 'temp-api-fix', status: 'healthy', timestamp: new Date().toISOString() });
});

// Dashboard endpoints
app.get('/api/docs/dashboard/pending/summary', authenticate, (req, res) => {
  res.json({
    success: true,
    data: {
      total: 0,
      top: [],
      lastUploads: []
    }
  });
});

app.get('/api/docs/dashboard/approval-kpis', authenticate, (req, res) => {
  res.json({
    success: true,
    data: {
      pending: 0,
      approvedToday: 0,
      asOf: new Date().toISOString()
    }
  });
});

// Approval endpoints
app.get('/api/docs/approval/pending', authenticate, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  
  res.json({
    success: true,
    data: {
      documents: [],
      pagination: {
        total: 0,
        page: page,
        limit: limit,
        pages: 0
      }
    }
  });
});

// Proxy other requests to main documentos service
app.use('*', (req, res) => {
  // For any other endpoint, return a standard 404
  res.status(404).json({ 
    success: false, 
    message: `Ruta ${req.method} ${req.originalUrl} no encontrada`, 
    code: 'ROUTE_NOT_FOUND' 
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Temp API Fix server running on port ${port}`);
});
