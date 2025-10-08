import { Router } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();

// Sirve archivos OpenAPI si existen junto al código
const rootDir = path.resolve(__dirname, '..', '..');
const yamlPath = path.join(rootDir, 'openapi.yaml');
const jsonPath = path.join(rootDir, 'openapi.json');

router.get('/', (_req, res) => {
  // Redirigir a Swagger UI si está empaquetado o entregar instrucciones
  res.json({
    message: 'Documentación OpenAPI',
    yaml: '/docs/openapi.yaml',
    json: '/docs/openapi.json',
  });
});

router.get('/openapi.yaml', (_req, res) => {
  if (fs.existsSync(yamlPath)) {
    res.type('text/yaml').send(fs.readFileSync(yamlPath, 'utf8'));
  } else {
    res.status(404).json({ message: 'openapi.yaml no encontrado' });
  }
});

router.get('/openapi.json', (_req, res) => {
  if (fs.existsSync(jsonPath)) {
    res.type('application/json').send(fs.readFileSync(jsonPath, 'utf8'));
  } else {
    res.status(404).json({ message: 'openapi.json no encontrado' });
  }
});

export default router;


