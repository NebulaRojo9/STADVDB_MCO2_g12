import { Router } from 'express';
import * as titleBasicsController from '../controllers/title_basics.controller.js';

const router = Router();

router.get('/init', titleBasicsController.init);
router.get('/:vmid/getAll', titleBasicsController.getAllFromNode);
router.post('/:vmid/create', titleBasicsController.addRowToNode);
router.put('/:vmid/update/:id', titleBasicsController.updateRowByIDInNode)

router.post('/routeCreate', titleBasicsController.routeCreateToNode)
router.put('/routeUpdate/:id', titleBasicsController.routeUpdateToNode);

export default router;