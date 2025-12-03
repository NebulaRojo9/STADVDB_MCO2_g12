// routes/test.routes.js
import { Router } from 'express';
import * as crashTestController from '../controllers/crash_test.controller.js'
import * as concurrencyTestController from '../controllers/concurrency_test.controller.js';

const router = Router();

// Helper Routes for Crash
router.post('/crash', crashTestController.triggerCrash);
router.post('/delay', crashTestController.setDelay);
router.post('/reset', crashTestController.resetState);

// GET TEST CASES FOR CONCURRENCY TESTING
router.get('/concurrency-1', concurrencyTestController.testReadRead);
router.get('/concurrency-2', concurrencyTestController.testWriteRead);
router.get('/concurrency-3', concurrencyTestController.testWriteWrite);

// Crash test routes
router.get('/crash-1/:testCheckpoint', crashTestController.writeNodeFCrashF);
router.get('/crash-2/:testCheckpoint', crashTestController.writeNodeCCrashF)

export default router;