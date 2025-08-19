import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { history, checkIcloud, checkSamsungKg, checkSamsungInfo, checkMiCloud } from '../controllers/devicesController.js';

const router = Router();

router.get('/history', authRequired, history);
router.post('/icloud/check', authRequired, checkIcloud);
router.post('/samsung/kg/check', authRequired, checkSamsungKg);
router.post('/samsung/info/check', authRequired, checkSamsungInfo);
router.post('/micloud/check', authRequired, checkMiCloud);

export default router;


