import { Request, Response } from 'express';
import { EODService } from '../services/eod.service.js';
import { handleControllerError } from '../utils/error-handler.js';
import { z } from 'zod';

// --- Zod schemas ---

const updateEODSchema = z.object({
  userId: z.string().min(1),
  summary: z.string().max(5000).optional(),
  highlights: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
  blockers: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
});

const dateParamSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
});

// --- Controllers ---

/** GET /eod/:date?userId=... — retrieve (or auto-generate) the EOD for a date */
export const getEOD = async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    const { date } = dateParamSchema.parse(req.params);

    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required', errorType: 'missing_required_field' });
    }

    const eod = await EODService.getOrCreateEOD(userId, date);
    res.json({ success: true, eod });
  } catch (error) {
    handleControllerError(res, error);
  }
};

/** PUT /eod/:date — update user-editable EOD fields (summary, highlights, blockers) */
export const updateEOD = async (req: Request, res: Response) => {
  try {
    const { date } = dateParamSchema.parse(req.params);
    const { userId, summary, highlights, blockers } = updateEODSchema.parse(req.body);

    const eod = await EODService.updateEOD(userId, date, { summary, highlights, blockers });
    res.json({ success: true, eod });
  } catch (error) {
    handleControllerError(res, error);
  }
};
