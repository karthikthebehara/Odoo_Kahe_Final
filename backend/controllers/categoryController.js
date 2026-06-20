const { pool } = require('../config/db');

// ─── Get All Categories ──────────────────────────────────────────────────────
/**
 * GET /api/categories
 * Returns all categories ordered by name.
 */
const getAllCategories = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, color, created_at FROM categories ORDER BY name ASC'
    );

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error('Get categories error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve categories',
    });
  }
};

// ─── Get Category by ID ─────────────────────────────────────────────────────
/**
 * GET /api/categories/:id
 * Returns a single category by its ID.
 */
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      'SELECT id, name, color, created_at FROM categories WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error('Get category error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve category',
    });
  }
};

// ─── Create Category ─────────────────────────────────────────────────────────
/**
 * POST /api/categories
 * Body: { name, color? }
 */
const createCategory = async (req, res) => {
  try {
    const { name, color } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Category name is required',
      });
    }

    // Check for duplicate name
    const [existing] = await pool.query(
      'SELECT id FROM categories WHERE name = ?',
      [name]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'A category with this name already exists',
      });
    }

    const [result] = await pool.query(
      'INSERT INTO categories (name, color) VALUES (?, ?)',
      [name, color || '#3498db']
    );

    return res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        name,
        color: color || '#3498db',
      },
    });
  } catch (error) {
    console.error('Create category error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create category',
    });
  }
};

// ─── Update Category ─────────────────────────────────────────────────────────
/**
 * PUT /api/categories/:id
 * Body: { name?, color? }
 */
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;

    // Verify category exists
    const [existing] = await pool.query(
      'SELECT * FROM categories WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
      });
    }

    // If renaming, check for duplicate
    if (name && name !== existing[0].name) {
      const [duplicate] = await pool.query(
        'SELECT id FROM categories WHERE name = ? AND id != ?',
        [name, id]
      );

      if (duplicate.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Another category with this name already exists',
        });
      }
    }

    const updatedName = name || existing[0].name;
    const updatedColor = color || existing[0].color;

    await pool.query(
      'UPDATE categories SET name = ?, color = ? WHERE id = ?',
      [updatedName, updatedColor, id]
    );

    return res.status(200).json({
      success: true,
      data: {
        id: Number(id),
        name: updatedName,
        color: updatedColor,
      },
    });
  } catch (error) {
    console.error('Update category error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update category',
    });
  }
};

// ─── Delete Category ─────────────────────────────────────────────────────────
/**
 * DELETE /api/categories/:id
 */
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query(
      'SELECT id FROM categories WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
      });
    }

    await pool.query('DELETE FROM categories WHERE id = ?', [id]);

    return res.status(200).json({
      success: true,
      data: { message: 'Category deleted successfully' },
    });
  } catch (error) {
    console.error('Delete category error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete category',
    });
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
