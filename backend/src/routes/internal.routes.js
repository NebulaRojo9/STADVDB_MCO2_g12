import { Router } from 'express';
import * as internalController from '../controllers/internal.controller.js';

const router = Router();

// Individual Operations
router.post('/commit', internalController.receiveCommit)
router.post('/abort', internalController.receiveAbort)
router.post('/prepare', internalController.receivePrepare)
router.post('/checkStatus/:id', internalController.checkTransactionStatus)

export default router;