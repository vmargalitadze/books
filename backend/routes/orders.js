// ============================================
// Orders Routes
// ============================================

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// ============================================
// GET /api/orders - Get all orders
// ============================================
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
        
        res.json({
            success: true,
            count: result.rows.length,
            orders: result.rows
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch orders'
        });
    }
});

// ============================================
// GET /api/orders/:id - Get single order by ID
// ============================================

router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Order not found' 
            });
        }
        
        res.json({
            success: true,
            order: result.rows[0]
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch order'
        });
    }
});

// ============================================
// POST /api/orders - Create new order
// ============================================

router.post('/', async (req, res) => {
    try {
        const { 
            image_id, 
            customer_name, 
            customer_email, 
            customer_phone, 
            customer_address, 
            quantity, 
            notes, 
            total_price 
        } = req.body;
        
        // Validation
        if (!image_id || !customer_name || !customer_email || !customer_phone || !customer_address || !quantity) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing required fields' 
            });
        }

        // Verify image exists
        const imageCheck = await pool.query('SELECT * FROM images WHERE id = $1', [image_id]);
        if (imageCheck.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Image not found' 
            });
        }

        // Insert order
        const result = await pool.query(
            `INSERT INTO orders (
                image_id, 
                customer_name, 
                customer_email, 
                customer_phone, 
                customer_address, 
                quantity, 
                notes, 
                total_price
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [
                image_id,
                customer_name,
                customer_email,
                customer_phone,
                customer_address,
                parseInt(quantity),
                notes || null,
                total_price ? parseFloat(total_price) : null
            ]
        );
        
        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            order: result.rows[0]
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create order'
        });
    }
});

// ============================================
// PUT /api/orders/:id - Update order status
// ============================================

router.put('/:id', async (req, res) => {
    try {
        const { status } = req.body;
        
        // Check if order exists
        const checkResult = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Order not found' 
            });
        }

        // Update order
        const result = await pool.query(
            `UPDATE orders 
             SET status = COALESCE($1, status),
                 updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2 
             RETURNING *`,
            [status || checkResult.rows[0].status, req.params.id]
        );
        
        res.json({
            success: true,
            message: 'Order updated successfully',
            order: result.rows[0]
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update order'
        });
    }
});

// ============================================
// DELETE /api/orders/:id - Delete order
// ============================================

router.delete('/:id', async (req, res) => {
    try {
        // Check if order exists
        const checkResult = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Order not found' 
            });
        }
        
        // Delete order
        await pool.query('DELETE FROM orders WHERE id = $1', [req.params.id]);
        
        res.json({
            success: true,
            message: 'Order deleted successfully'
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete order'
        });
    }
});

module.exports = router;

