import { Router } from 'express';
import * as titleBasicsCrudController from '../controllers/title_basics_crud.controller.js'
import { requireStartYear } from '../middleware/fragment_validator.js';
import { formatDelay } from '../middleware/delay_validator.js';

const router = Router();

// Helper Functions
router.delete('/resetDatabases', titleBasicsCrudController.resetDatabases);

router.get('/readAll', titleBasicsCrudController.readTitleAll);
router.get('/readAllFromNode', titleBasicsCrudController.readTitleFromNode);
router.post('/create', requireStartYear, formatDelay, titleBasicsCrudController.createTitle);
router.get('/read/:id', requireStartYear, formatDelay, titleBasicsCrudController.readTitle);
router.put('/update/:id', requireStartYear, formatDelay, titleBasicsCrudController.updateTitle);
router.delete('/delete/:id', requireStartYear, formatDelay, titleBasicsCrudController.deleteTitle);

export default router;