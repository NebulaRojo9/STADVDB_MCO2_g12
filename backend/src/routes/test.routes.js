// routes/test.routes.js
import { Router } from 'express';
import * as testController from '../controllers/test.controller.js';

const router = Router();

// POST /test/crash -> Body: { "enable": true }
router.post('/crash', testController.triggerCrash);

// POST /test/delay -> Body: { "delay": 10000 }
router.post('/delay', testController.setDelay);

// POST /test/reset
router.post('/reset', testController.resetState);

export default router;