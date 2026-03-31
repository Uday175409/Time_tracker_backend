import { Request, Response } from 'express';
import { TemplateService } from '../services/template.service.js';
import { handleControllerError } from '../utils/error-handler.js';
import { z } from 'zod';

const sectionSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['text', 'list', 'metrics', 'category_breakdown']),
  placeholder: z.string().optional(),
  order: z.number(),
});

const createTemplateSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).max(50),
  sections: z.array(sectionSchema).min(1),
});

const updateTemplateSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).max(50).optional(),
  sections: z.array(sectionSchema).optional(),
});

/** GET /templates?userId=... */
export const getTemplates = async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ success: false, message: 'userId required', errorType: 'missing_required_field' });

    const templates = await TemplateService.getTemplates(userId);
    res.json({ success: true, templates });
  } catch (error) {
    handleControllerError(res, error);
  }
};

/** GET /templates/:id?userId=... */
export const getTemplate = async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    const templateId = req.params.id;
    if (!userId) return res.status(400).json({ success: false, message: 'userId required', errorType: 'missing_required_field' });

    const template = await TemplateService.getTemplate(templateId, userId);
    res.json({ success: true, template });
  } catch (error) {
    handleControllerError(res, error);
  }
};

/** POST /templates */
export const createTemplate = async (req: Request, res: Response) => {
  try {
    const { userId, name, sections } = createTemplateSchema.parse(req.body);
    const template = await TemplateService.createTemplate(userId, name, sections);
    res.json({ success: true, template });
  } catch (error) {
    handleControllerError(res, error);
  }
};

/** PUT /templates/:id */
export const updateTemplate = async (req: Request, res: Response) => {
  try {
    const templateId = req.params.id;
    const { userId, name, sections } = updateTemplateSchema.parse(req.body);
    const template = await TemplateService.updateTemplate(templateId, userId, { name, sections });
    res.json({ success: true, template });
  } catch (error) {
    handleControllerError(res, error);
  }
};

/** DELETE /templates/:id?userId=... */
export const deleteTemplate = async (req: Request, res: Response) => {
  try {
    const templateId = req.params.id;
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ success: false, message: 'userId required', errorType: 'missing_required_field' });

    const template = await TemplateService.deleteTemplate(templateId, userId);
    res.json({ success: true, template });
  } catch (error) {
    handleControllerError(res, error);
  }
};
