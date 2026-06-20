const { pool } = require('../config/db');

// ─── Get All Products ────────────────────────────────────────────────────────
/**
 * GET /api/products
 * Returns all products with their category name joined.
 */
const getAllProducts = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        p.id, p.name, p.price, p.uom, p.tax, p.description,
        p.is_available, p.category_id, p.created_at,
        c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.name ASC
    `);

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error('Get products error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve products',
    });
  }
};

// ─── Get Product by ID ──────────────────────────────────────────────────────
/**
 * GET /api/products/:id
 */
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT 
        p.id, p.name, p.price, p.uom, p.tax, p.description,
        p.is_available, p.category_id, p.created_at,
        c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error('Get product error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve product',
    });
  }
};

// ─── Create Product ──────────────────────────────────────────────────────────
/**
 * POST /api/products
 * Body: { name, category_id | category_name, price, uom?, tax?, description?, is_available? }
 *
 * Accepts either category_id directly or category_name to resolve the ID.
 */
const createProduct = async (req, res) => {
  try {
    const {
      name,
      category_id,
      category_name,
      price,
      uom,
      tax,
      description,
      is_available,
    } = req.body;

    // ── Validate required fields ──
    if (!name || price === undefined || price === null) {
      return res.status(400).json({
        success: false,
        error: 'Product name and price are required',
      });
    }

    // ── Resolve category_id ──
    let resolvedCategoryId = category_id || null;

    if (!resolvedCategoryId && category_name) {
      // Look up category by name
      const [catRows] = await pool.query(
        'SELECT id FROM categories WHERE name = ?',
        [category_name]
      );

      if (catRows.length === 0) {
        return res.status(400).json({
          success: false,
          error: `Category '${category_name}' does not exist`,
        });
      }

      resolvedCategoryId = catRows[0].id;
    }

    // Validate that category_id actually exists (if provided)
    if (resolvedCategoryId) {
      const [catCheck] = await pool.query(
        'SELECT id FROM categories WHERE id = ?',
        [resolvedCategoryId]
      );

      if (catCheck.length === 0) {
        return res.status(400).json({
          success: false,
          error: `Category with ID ${resolvedCategoryId} does not exist`,
        });
      }
    }

    const [result] = await pool.query(
      `INSERT INTO products (name, category_id, price, uom, tax, description, is_available)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        resolvedCategoryId,
        price,
        uom || 'unit',
        tax || 0.0,
        description || null,
        is_available !== undefined ? is_available : true,
      ]
    );

    return res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        name,
        category_id: resolvedCategoryId,
        price,
        uom: uom || 'unit',
        tax: tax || 0.0,
        description: description || null,
        is_available: is_available !== undefined ? is_available : true,
      },
    });
  } catch (error) {
    console.error('Create product error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create product',
    });
  }
};

// ─── Update Product ──────────────────────────────────────────────────────────
/**
 * PUT /api/products/:id
 * Body: { name?, category_id?, price?, uom?, tax?, description?, is_available? }
 */
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category_id, price, uom, tax, description, is_available } =
      req.body;

    // Verify product exists
    const [existing] = await pool.query(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    const current = existing[0];

    // If changing category, validate it exists
    const newCategoryId =
      category_id !== undefined ? category_id : current.category_id;

    if (newCategoryId) {
      const [catCheck] = await pool.query(
        'SELECT id FROM categories WHERE id = ?',
        [newCategoryId]
      );

      if (catCheck.length === 0) {
        return res.status(400).json({
          success: false,
          error: `Category with ID ${newCategoryId} does not exist`,
        });
      }
    }

    const updatedName = name !== undefined ? name : current.name;
    const updatedPrice = price !== undefined ? price : current.price;
    const updatedUom = uom !== undefined ? uom : current.uom;
    const updatedTax = tax !== undefined ? tax : current.tax;
    const updatedDesc =
      description !== undefined ? description : current.description;
    const updatedAvailable =
      is_available !== undefined ? is_available : current.is_available;

    await pool.query(
      `UPDATE products
       SET name = ?, category_id = ?, price = ?, uom = ?, tax = ?, description = ?, is_available = ?
       WHERE id = ?`,
      [
        updatedName,
        newCategoryId,
        updatedPrice,
        updatedUom,
        updatedTax,
        updatedDesc,
        updatedAvailable,
        id,
      ]
    );

    return res.status(200).json({
      success: true,
      data: {
        id: Number(id),
        name: updatedName,
        category_id: newCategoryId,
        price: updatedPrice,
        uom: updatedUom,
        tax: updatedTax,
        description: updatedDesc,
        is_available: updatedAvailable,
      },
    });
  } catch (error) {
    console.error('Update product error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update product',
    });
  }
};

// ─── Delete Product ──────────────────────────────────────────────────────────
/**
 * DELETE /api/products/:id
 */
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query(
      'SELECT id FROM products WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    await pool.query('DELETE FROM products WHERE id = ?', [id]);

    return res.status(200).json({
      success: true,
      data: { message: 'Product deleted successfully' },
    });
  } catch (error) {
    console.error('Delete product error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete product',
    });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
