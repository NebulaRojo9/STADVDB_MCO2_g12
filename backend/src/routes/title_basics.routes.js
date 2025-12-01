import { Router } from 'express';
import * as titleBasicsCrudController from '../controllers/title_basics_crud.controller.js'
import { requireStartYear } from '../middleware/fragment_validator.js';

const router = Router();

// Helper Functions
router.delete('/resetDatabases', titleBasicsCrudController.resetDatabases);

router.get('/readAll', titleBasicsCrudController.readTitleAll);
router.get('/readAllFromNode', titleBasicsCrudController.readTitleFromNode);
router.post('/create', requireStartYear, titleBasicsCrudController.createTitle);
router.get('/read/:id', requireStartYear, titleBasicsCrudController.readTitle);
router.put('/update/:id', requireStartYear, titleBasicsCrudController.updateTitle);
router.delete('/delete/:id', requireStartYear, titleBasicsCrudController.deleteTitle);

export default router;