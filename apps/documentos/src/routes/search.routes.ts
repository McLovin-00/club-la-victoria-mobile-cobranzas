import { Router } from 'express';
import { authenticate, validate } from '../middlewares/auth.middleware';
import { generalRateLimit } from '../middlewares/rateLimiter.middleware';
import { SearchController } from '../controllers/search.controller';
import { searchQuerySchema } from '../schemas/validation.schemas';

const router = Router();

router.use(authenticate);
router.use(generalRateLimit);
router.get('/', validate(searchQuerySchema), SearchController.search);

export default router;


