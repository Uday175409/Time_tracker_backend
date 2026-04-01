import express from 'express';
import {
	startTracking,
	stopTracking,
	getToday,
	getHistory,
	updateEntry,
	createManualEntryController,
	regularizeEntryController,
	reviewRegularizationController,
} from '../controllers/time.controller.js';

const router = express.Router();

router.post('/start', startTracking);
router.post('/stop', stopTracking);
router.post('/manual', createManualEntryController);
router.get('/today', getToday);
router.get('/history', getHistory);
router.put('/update', updateEntry);
router.put('/regularize/:entryId', regularizeEntryController);
router.patch('/regularize/:entryId/review', reviewRegularizationController);

export default router;
