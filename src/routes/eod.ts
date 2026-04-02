import express from 'express';
import { getCurrentEOD, getEOD, updateEOD } from '../controllers/eod.controller.js';

const router = express.Router();

router.get('/current', getCurrentEOD);
router.get('/:date', getEOD);
router.put('/:date', updateEOD);

export default router;
