import { Router, Request, Response } from 'express';
import { prismaService } from '../config/prisma';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const start = Date.now();
    const mem = process.memoryUsage();
    const dbOk = await prismaService.checkConnection();
    const respMs = Date.now() - start;

    const metrics = `
# HELP backend_info Información del backend
# TYPE backend_info gauge
backend_info{version="${process.env.npm_package_version || '1.0.0'}",environment="${process.env.NODE_ENV || 'development'}"} 1

# HELP backend_uptime_seconds Uptime del proceso en segundos
# TYPE backend_uptime_seconds counter
backend_uptime_seconds ${process.uptime()}

# HELP backend_memory_usage_bytes Uso de memoria del proceso
# TYPE backend_memory_usage_bytes gauge
backend_memory_usage_bytes{type="heap_used"} ${mem.heapUsed}
backend_memory_usage_bytes{type="heap_total"} ${mem.heapTotal}
backend_memory_usage_bytes{type="external"} ${mem.external}
backend_memory_usage_bytes{type="rss"} ${mem.rss}

# HELP backend_database_healthy Estado de la base de datos (1=OK,0=NOK)
# TYPE backend_database_healthy gauge
backend_database_healthy ${dbOk ? 1 : 0}

# HELP backend_metrics_response_time_ms Tiempo de respuesta del endpoint de métricas
# TYPE backend_metrics_response_time_ms gauge
backend_metrics_response_time_ms ${respMs}
`.trim();

    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8').status(200).send(metrics);
  } catch {
    res.status(500).send('# error generating metrics\n');
  }
});

export default router;


