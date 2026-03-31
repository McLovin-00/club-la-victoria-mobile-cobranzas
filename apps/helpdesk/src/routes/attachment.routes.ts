import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { prisma } from '../config/database';
import { AppLogger } from '../config/logger';
import { getPresignedUrl } from '../config/minio';

const router: Router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// GET /api/helpdesk/attachments/:id/download - Descargar adjunto
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const attachmentId = Array.isArray(id) ? id[0] : id;

    const attachment = await prisma.messageAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      res.status(404).json({
        success: false,
        message: 'Adjunto no encontrado',
      });
      return;
    }

    const presignedUrl = await getPresignedUrl(attachment.minioKey, 60 * 60);

    res.redirect(presignedUrl);
  } catch (error) {
    AppLogger.error('Error downloading attachment:', error);
    res.status(500).json({
      success: false,
      message: 'Error al descargar adjunto',
    });
  }
});

export default router;
