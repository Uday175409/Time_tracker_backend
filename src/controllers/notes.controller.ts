import { Request, Response } from 'express';
import { NotesService } from '../services/notes.service.js';
import { handleControllerError } from '../utils/error-handler.js';
import { z } from 'zod';

// --- Zod schemas for request validation ---

const createNoteSchema = z.object({
  userId: z.string().min(1),
  linkedType: z.enum(['SESSION', 'DAY']),
  referenceId: z.string().min(1),
  content: z.string().trim().min(1, 'Note content cannot be empty').max(5000, 'Note is too long'),
});

const updateNoteSchema = z.object({
  content: z.string().trim().min(1, 'Note content cannot be empty').max(5000, 'Note is too long'),
  userId: z.string().min(1),
});

const getNotesQuerySchema = z.object({
  userId: z.string().min(1),
  linkedType: z.enum(['SESSION', 'DAY']),
  referenceId: z.string().min(1),
});

// --- Controllers ---

export const createNote = async (req: Request, res: Response) => {
  try {
    const { userId, linkedType, referenceId, content } = createNoteSchema.parse(req.body);
    const note = await NotesService.createNote(userId, linkedType, referenceId, content);
    res.json({ success: true, note });
  } catch (error) {
    handleControllerError(res, error);
  }
};

export const updateNote = async (req: Request, res: Response) => {
  try {
    const noteId = req.params.id;
    const { content, userId } = updateNoteSchema.parse(req.body);
    const note = await NotesService.updateNote(noteId, userId, content);
    res.json({ success: true, note });
  } catch (error) {
    handleControllerError(res, error);
  }
};

export const getNotes = async (req: Request, res: Response) => {
  try {
    const { userId, linkedType, referenceId } = getNotesQuerySchema.parse(req.query);

    const notes = await NotesService.getNotes(userId, linkedType, referenceId);
    res.json({ success: true, notes });
  } catch (error) {
    handleControllerError(res, error);
  }
};

export const deleteNote = async (req: Request, res: Response) => {
  try {
    const noteId = req.params.id;
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required', errorType: 'missing_required_field' });
    }
    const note = await NotesService.deleteNote(noteId, userId);
    res.json({ success: true, note });
  } catch (error) {
    handleControllerError(res, error);
  }
};
