const { pool } = require('../config/db');

const getAllPromotions = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM promotions ORDER BY name ASC');
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Get promotions error:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve promotions' });
  }
};

const createPromotion = async (req, res) => {
  try {
    const {
      name,
      type,
      discount_type,
      value,
      coupon_code,
      product_id,
      min_quantity,
      min_order_amount,
      start_date,
      end_date,
      is_active
    } = req.body;

    if (!name || !type || !discount_type || value === undefined) {
      return res.status(400).json({ success: false, error: 'Name, type, discount_type, and value are required.' });
    }

    const [result] = await pool.query(
      `INSERT INTO promotions 
        (name, type, discount_type, value, coupon_code, product_id, min_quantity, min_order_amount, start_date, end_date, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        type,
        discount_type,
        value,
        coupon_code || null,
        product_id || null,
        min_quantity || null,
        min_order_amount || null,
        start_date || null,
        end_date || null,
        is_active !== undefined ? is_active : true
      ]
    );

    return res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        name,
        type,
        discount_type,
        value,
        coupon_code,
        product_id,
        min_quantity,
        min_order_amount,
        start_date,
        end_date,
        is_active: is_active !== undefined ? is_active : true
      }
    });
  } catch (error) {
    console.error('Create promotion error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create promotion' });
  }
};

const updatePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      discount_type,
      value,
      coupon_code,
      product_id,
      min_quantity,
      min_order_amount,
      start_date,
      end_date,
      is_active
    } = req.body;

    const [existing] = await pool.query('SELECT * FROM promotions WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Promotion not found' });
    }
    const current = existing[0];

    const uName = name !== undefined ? name : current.name;
    const uType = type !== undefined ? type : current.type;
    const uDiscountType = discount_type !== undefined ? discount_type : current.discount_type;
    const uValue = value !== undefined ? value : current.value;
    const uCouponCode = coupon_code !== undefined ? coupon_code : current.coupon_code;
    const uProductId = product_id !== undefined ? product_id : current.product_id;
    const uMinQty = min_quantity !== undefined ? min_quantity : current.min_quantity;
    const uMinAmt = min_order_amount !== undefined ? min_order_amount : current.min_order_amount;
    const uStartDate = start_date !== undefined ? start_date : current.start_date;
    const uEndDate = end_date !== undefined ? end_date : current.end_date;
    const uIsActive = is_active !== undefined ? is_active : current.is_active;

    await pool.query(
      `UPDATE promotions SET 
        name = ?, type = ?, discount_type = ?, value = ?, coupon_code = ?, 
        product_id = ?, min_quantity = ?, min_order_amount = ?, start_date = ?, 
        end_date = ?, is_active = ? 
       WHERE id = ?`,
      [uName, uType, uDiscountType, uValue, uCouponCode, uProductId, uMinQty, uMinAmt, uStartDate, uEndDate, uIsActive, id]
    );

    return res.status(200).json({
      success: true,
      data: {
        id,
        name: uName,
        type: uType,
        discount_type: uDiscountType,
        value: uValue,
        coupon_code: uCouponCode,
        product_id: uProductId,
        min_quantity: uMinQty,
        min_order_amount: uMinAmt,
        start_date: uStartDate,
        end_date: uEndDate,
        is_active: uIsActive
      }
    });
  } catch (error) {
    console.error('Update promotion error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update promotion' });
  }
};

const deletePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM promotions WHERE id = ?', [id]);
    return res.status(200).json({ success: true, data: { message: 'Promotion deleted successfully' } });
  } catch (error) {
    console.error('Delete promotion error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete promotion' });
  }
};

const validateCoupon = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: 'Coupon code is required.' });
    }

    const [rows] = await pool.query(
      `SELECT * FROM promotions 
       WHERE type = 'coupon' 
         AND coupon_code = ? 
         AND is_active = 1 
         AND (start_date IS NULL OR start_date <= CURDATE())
         AND (end_date IS NULL OR end_date >= CURDATE())`,
      [code]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid or expired coupon code.' });
    }

    return res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Validate coupon error:', error);
    return res.status(500).json({ success: false, error: 'Failed to validate coupon' });
  }
};

module.exports = {
  getAllPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  validateCoupon
};
