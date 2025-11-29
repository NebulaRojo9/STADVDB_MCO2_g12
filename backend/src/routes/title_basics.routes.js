import { Router } from 'express';
import * as titleBasicsController from '../controllers/title_basics.controller.js';

const router = Router();

router.get('/init', titleBasicsController.init);
router.get('/:vmid/getAll', titleBasicsController.getAll);
router.post('/:vmid/create', titleBasicsController.addRow);
router.put('/:vmid/update/:id', titleBasicsController.updateRowByID)

export default router;