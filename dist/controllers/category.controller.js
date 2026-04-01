import { CategoryService } from '../services/category.service.js';
import { handleControllerError } from '../utils/error-handler.js';
import { z } from 'zod';
const addCategorySchema = z.object({
    userId: z.string().min(1),
    name: z.string().min(1, 'Category name is required').max(30),
    color: z.string().optional(),
    tag: z.string().optional(),
    isProductive: z.boolean().optional(),
});
/** GET /categories?userId=... */
export const getCategories = async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId)
            return res.status(400).json({ success: false, message: 'userId required', errorType: 'missing_required_field' });
        const categories = await CategoryService.getCategories(userId);
        res.json({ success: true, categories });
    }
    catch (error) {
        handleControllerError(res, error);
    }
};
/** POST /categories */
export const addCategory = async (req, res) => {
    try {
        const { userId, name, color, tag, isProductive } = addCategorySchema.parse(req.body);
        const category = await CategoryService.addCategory(userId, name, color, tag, isProductive);
        res.json({ success: true, category });
    }
    catch (error) {
        handleControllerError(res, error);
    }
};
/** DELETE /categories/:id?userId=... */
export const deleteCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const userId = req.query.userId;
        if (!userId)
            return res.status(400).json({ success: false, message: 'userId required', errorType: 'missing_required_field' });
        const category = await CategoryService.deleteCategory(categoryId, userId);
        res.json({ success: true, category });
    }
    catch (error) {
        handleControllerError(res, error);
    }
};
