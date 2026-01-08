// ============================================
// Promo Codes Routes
// ============================================

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// ============================================
// Helper Functions
// ============================================

// Generate random promo code (6 characters: digits and English letters)
function generatePromoCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Generate unique promo code (with retry logic to ensure uniqueness)
async function generateUniquePromoCode(maxRetries = 10) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const code = generatePromoCode();
        
        // Check if code already exists
        const checkResult = await pool.query('SELECT id FROM promo_codes WHERE code = $1', [code]);
        
        if (checkResult.rows.length === 0) {
            return code; // Unique code found
        }
    }
    
    // If we couldn't generate a unique code after maxRetries attempts, throw error
    throw new Error('Failed to generate unique promo code after multiple attempts');
}

// ============================================
// GET /api/promocodes - Get all promo codes
// ============================================

router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM promo_codes ORDER BY created_at DESC');
        
        res.json({
            success: true,
            count: result.rows.length,
            promo_codes: result.rows
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch promo codes'
        });
    }
});

// ============================================
// GET /api/promocodes/:id - Get single promo code by ID
// ============================================

router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM promo_codes WHERE id = $1', [req.params.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Promo code not found' 
            });
        }
        
        res.json({
            success: true,
            promo_code: result.rows[0]
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch promo code'
        });
    }
});

// ============================================
// POST /api/promocodes - Create new promo code
// ============================================

router.post('/', async (req, res) => {
    try {
        const { discount_percentage, code } = req.body;
        
        if (!discount_percentage) {
            return res.status(400).json({ 
                success: false,
                error: 'Discount percentage is required' 
            });
        }

        const discount = parseFloat(discount_percentage);
        if (isNaN(discount) || discount < 0 || discount > 100) {
            return res.status(400).json({ 
                success: false,
                error: 'Discount percentage must be between 0 and 100' 
            });
        }

        // Generate unique code automatically (code parameter is no longer used from frontend)
        let promoCode;
        if (code) {
            // If code is provided (for backward compatibility), validate it
            promoCode = code.toUpperCase().trim();
            if (promoCode.length !== 6) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Promo code must be exactly 6 characters' 
                });
            }
            if (!/^[A-Z0-9]+$/.test(promoCode)) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Promo code must contain only English letters and digits' 
                });
            }
            
            // Check if provided code already exists
            const checkResult = await pool.query('SELECT id FROM promo_codes WHERE code = $1', [promoCode]);
            if (checkResult.rows.length > 0) {
                return res.status(400).json({ 
                    success: false,
                    error: 'This promo code already exists' 
                });
            }
        } else {
            // Auto-generate unique promo code
            try {
                promoCode = await generateUniquePromoCode();
            } catch (genError) {
                console.error('Error generating unique promo code:', genError);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to generate unique promo code. Please try again.'
                });
            }
        }

        // Insert into database
        const result = await pool.query(
            'INSERT INTO promo_codes (code, discount_percentage) VALUES ($1, $2) RETURNING *',
            [promoCode, discount]
        );
        
        res.status(201).json({
            success: true,
            message: 'Promo code created successfully',
            promo_code: result.rows[0]
        });
    } catch (error) {
        console.error('Database error:', error);
        if (error.code === '23505') { // Unique constraint violation
            return res.status(400).json({
                success: false,
                error: 'This promo code already exists'
            });
        }
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create promo code'
        });
    }
});

// ============================================
// PUT /api/promocodes/:id - Update promo code
// ============================================

router.put('/:id', async (req, res) => {
    try {
        const { discount_percentage, is_active } = req.body;
        
        // Check if promo code exists
        const checkResult = await pool.query('SELECT * FROM promo_codes WHERE id = $1', [req.params.id]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Promo code not found' 
            });
        }

        const existingPromoCode = checkResult.rows[0];
        let discount = existingPromoCode.discount_percentage;
        let active = existingPromoCode.is_active;

        // Update discount percentage if provided
        if (discount_percentage !== undefined) {
            const newDiscount = parseFloat(discount_percentage);
            if (isNaN(newDiscount) || newDiscount < 0 || newDiscount > 100) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Discount percentage must be between 0 and 100' 
                });
            }
            discount = newDiscount;
        }

        // Update is_active if provided
        if (is_active !== undefined) {
            active = Boolean(is_active);
        }

        // Update database
        const result = await pool.query(
            `UPDATE promo_codes 
             SET discount_percentage = $1, 
                 is_active = $2,
                 updated_at = CURRENT_TIMESTAMP 
             WHERE id = $3 
             RETURNING *`,
            [discount, active, req.params.id]
        );
        
        res.json({
            success: true,
            message: 'Promo code updated successfully',
            promo_code: result.rows[0]
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update promo code'
        });
    }
});

// ============================================
// DELETE /api/promocodes/:id - Delete promo code
// ============================================

router.delete('/:id', async (req, res) => {
    try {
        // Check if promo code exists
        const checkResult = await pool.query('SELECT * FROM promo_codes WHERE id = $1', [req.params.id]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Promo code not found' 
            });
        }

        const deletedPromoCode = checkResult.rows[0];
        
        // Delete promo code from database
        await pool.query('DELETE FROM promo_codes WHERE id = $1', [req.params.id]);
        
        res.json({
            success: true,
            message: 'Promo code deleted successfully',
            promo_code: deletedPromoCode
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete promo code'
        });
    }
});

module.exports = router;

