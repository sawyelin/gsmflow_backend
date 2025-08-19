import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { listOrders, getOrder, createOrder, cancelOrder, placeOrder, checkOrderStatus } from '../controllers/ordersController.js';

const router = Router();

router.get('/', authRequired, listOrders);
router.get('/:id', authRequired, getOrder);
router.post('/', authRequired, createOrder);
router.post('/:id/place', authRequired, placeOrder);
router.post('/:id/check-status', authRequired, checkOrderStatus);
router.delete('/:id', authRequired, cancelOrder);

export default router;


