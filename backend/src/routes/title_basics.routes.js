import { Router } from 'express';
import * as titleBasicsController from '../controllers/title_basics.controller.js';
import * as titleBasicsCrudController from '../controllers/title_basics_crud.controller.js'

const router = Router();

router.get('/init', titleBasicsController.init);

// Individual Operations
router.get('/:vmid/getAll', titleBasicsController.getAllFromNode);
router.post('/:vmid/create', titleBasicsController.addRowToNode);
router.put('/:vmid/update/:id', titleBasicsController.updateRowByIDInNode)
router.delete('/:vmid/delete/:id', titleBasicsController.deleteRowByIDInNode);

// Helper Functions
router.delete('/resetDatabases', titleBasicsController.resetDatabases);
router.get('/readAllFromNode', titleBasicsCrudController.readTitleFromNode)

// Operations that are connected to the other operations (will probs be placed in the communication file and refactored to work as such)
router.get('/:vmid/routeRead', titleBasicsController.routeReadFromNode)
router.get('/:vmid/routeReadRow/:id', titleBasicsController.routeReadRowFromNode)
router.post('/:vmid/routeCreate', titleBasicsController.routeCreateToNode);
router.put('/:vmid/routeUpdate/:id/:startYear', titleBasicsController.routeUpdateToNode);
router.delete('/:vmid/routeDelete/:id/:startYear', titleBasicsController.routeDeleteRowFromNode);

router.get('/read/:id', titleBasicsCrudController.readTitle);
router.get('/readAll', titleBasicsCrudController.readTitleAll);
router.get('/readAllFromNode', titleBasicsCrudController.readTitleFromNode);
router.post('/create', titleBasicsCrudController.createTitle);
router.put('/update/:id', titleBasicsCrudController.updateTitle);
router.delete('/delete/:id', titleBasicsCrudController.deleteTitle);
export default router;