import { Router } from 'express';
import * as titleBasicsCrudController from '../controllers/title_basics_crud.controller.js'

const router = Router();

// Helper Functions
router.delete('/resetDatabases', titleBasicsCrudController.resetDatabases);

// CRUD
router.get('/read/:id', titleBasicsCrudController.readTitle);
router.get('/readAll', titleBasicsCrudController.readTitleAll);
router.get('/readAllFromNode', titleBasicsCrudController.readTitleFromNode);
router.post('/create', titleBasicsCrudController.createTitle);
router.put('/update/:id', titleBasicsCrudController.updateTitle);
router.delete('/delete/:id', titleBasicsCrudController.deleteTitle);

export default router;