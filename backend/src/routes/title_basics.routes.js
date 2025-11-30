import { Router } from 'express';
import * as titleBasicsController from '../controllers/title_basics.controller.js';

const router = Router();

router.get('/init', titleBasicsController.init);

// Individual Operations
router.get('/:vmid/getAll', titleBasicsController.getAllFromNode);
router.post('/:vmid/create', titleBasicsController.addRowToNode);
router.put('/:vmid/update/:id', titleBasicsController.updateRowByIDInNode)
router.delete('/:vmid/delete/:id', titleBasicsController.deleteRowByIDInNode);

// Operations that are connected to the other operations
router.post('/:vmid/routeCreate', titleBasicsController.routeCreateToNode);
router.put('/:vmid/routeUpdate/:id', titleBasicsController.routeUpdateToNode);

export default router;