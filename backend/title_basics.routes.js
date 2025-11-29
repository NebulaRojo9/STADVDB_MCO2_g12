import { Router } from 'express';
import * as titleBasicsController from './title_basics.controller.js';

const router = Router();

router.get('/init', titleBasicsController.initTitleBasics)
router.get('/:vmid', titleBasicsController.getTitleBasics);

export default router;