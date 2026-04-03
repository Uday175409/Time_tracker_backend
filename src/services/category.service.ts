import Category, { DEFAULT_CATEGORIES } from '../models/Category.js';
import { clearLiveDayCaches } from '../lib/redis-cache.js';

const PRODUCTIVE_CACHE_TTL_MS = 60_000;
const productiveNamesCache = new Map<string, { expiresAt: number; names: string[] }>();

function clearProductiveNamesCache(userId: string) {
  productiveNamesCache.delete(userId);
}

/**
 * CategoryService manages user-specific work categories.
 * On first access, default categories are seeded automatically.
 */
export class CategoryService {
  /**
   * Get all categories for a user.
   * If the user has none yet, seed with defaults.
   */
  static async getCategories(userId: string) {
    let categories = await Category.find({ userId }).sort({ order: 1 }).lean();

    // First-time user — seed with defaults
    if (categories.length === 0) {
      const docs = DEFAULT_CATEGORIES.map((c) => ({ ...c, userId }));
      await Category.insertMany(docs);
      categories = await Category.find({ userId }).sort({ order: 1 }).lean();
    }

    return categories;
  }

  /** Add a new category for a user */
  static async addCategory(
    userId: string,
    name: string,
    color: string = 'blue',
    tag: string = 'Other',
    isProductive: boolean = true
  ) {
    // Determine next order value
    const maxOrder = await Category.findOne({ userId })
      .sort({ order: -1 })
      .select('order')
      .lean();
    const order = maxOrder ? maxOrder.order + 1 : 0;

    const category = await Category.create({
      userId,
      name: name.trim(),
      color,
      tag,
      isProductive,
      order,
    });

    clearProductiveNamesCache(userId);
    await clearLiveDayCaches(userId);

    return category;
  }

  /** Delete a category by ID (only if it belongs to the user) */
  static async deleteCategory(categoryId: string, userId: string) {
    const category = await Category.findOneAndDelete({ _id: categoryId, userId });
    if (!category) throw new Error('Category not found or access denied');
    clearProductiveNamesCache(userId);
    await clearLiveDayCaches(userId);
    return category;
  }

  /**
   * Returns the list of productive category names for a user.
   * Used by analytics to compute productivity score dynamically.
   */
  static async getProductiveNames(userId: string): Promise<string[]> {
    const cached = productiveNamesCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.names;
    }

    await this.getCategories(userId);
    const categories = await Category.find({ userId, isProductive: true })
      .select('name -_id')
      .lean();
    const names = categories.map((c) => c.name);

    productiveNamesCache.set(userId, {
      names,
      expiresAt: Date.now() + PRODUCTIVE_CACHE_TTL_MS,
    });

    return names;
  }
}
