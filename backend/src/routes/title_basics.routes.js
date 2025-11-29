import { Router } from 'express';
import * as titleBasicsController from '../controllers/title_basics.controller.js';

const router = Router();

router.get('/init', titleBasicsController.init);
router.get('/vm/:vmid', titleBasicsController.getAll);
router.post('/create', titleBasicsController.addRow);
router.put('/vm/:vmid/update/:id', titleBasicsController.updateRowByID)

export default router;