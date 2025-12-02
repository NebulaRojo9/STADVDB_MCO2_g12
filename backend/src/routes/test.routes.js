// routes/test.routes.js
import { Router } from 'express';
import * as testController from '../controllers/test.controller.js';
import * as concurrencyTestController from '../controllers/concurrency_test.controller.js';

const router = Router();

// POST /test/crash -> Body: { "enable": true }
router.post('/crash', testController.triggerCrash);

// POST /test/delay -> Body: { "delay": 10000 }
router.post('/delay', testController.setDelay);

// POST /test/reset
router.post('/reset', testController.resetState);

// GET TEST CASES FOR CONCURRENCY TESTING
router.get('/concurrency-1', concurrencyTestController.testReadRead);
// router.get('/concurrency-2', concurrencyTestController.testCase2);
// router.get('/concurrency-3', concurrencyTestController.testCase3);

export default router;