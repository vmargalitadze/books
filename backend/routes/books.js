// ============================================
// Books Routes
// ============================================

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// ============================================
// GET /api/books - Get all books
// ============================================
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM books ORDER BY created_at DESC');
        
        res.json({
            success: true,
            count: result.rows.length,
            books: result.rows
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch books'
        });
    }
});

// ============================================
// GET /api/books/:id - Get single book by ID
// ============================================

router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM books WHERE id = $1', [req.params.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Book not found' 
            });
        }
        
        res.json({
            success: true,
            book: result.rows[0]
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch book'
        });
    }
});

// ============================================
// POST /api/books - Create new book
// ============================================

router.post('/', async (req, res) => {
    try {
        const { title, description, price, author, cover_image_url, images } = req.body;
        
        if (!title || !images || images.length === 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Title and images are required' 
            });
        }
        
        const result = await pool.query(
            'INSERT INTO books (title, description, price, author, cover_image_url, images) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [title || 'Untitled Book', description || null, price ? parseFloat(price) : null, author || 'Unknown', cover_image_url || null, images]
        );
        
        res.status(201).json({
            success: true,
            message: 'Book created successfully',
            book: result.rows[0]
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create book'
        });
    }
});

// ============================================
// PUT /api/books/:id - Update book
// ============================================

router.put('/:id', async (req, res) => {
    try {
        const { title, description, price, author, cover_image_url, images } = req.body;
        
        // Check if book exists
        const checkResult = await pool.query('SELECT * FROM books WHERE id = $1', [req.params.id]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Book not found' 
            });
        }
        
        const result = await pool.query(
            'UPDATE books SET title = COALESCE($1, title), description = COALESCE($2, description), price = COALESCE($3, price), author = COALESCE($4, author), cover_image_url = COALESCE($5, cover_image_url), images = COALESCE($6, images), updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *',
            [title, description, price ? parseFloat(price) : null, author, cover_image_url, images, req.params.id]
        );
        
        res.json({
            success: true,
            message: 'Book updated successfully',
            book: result.rows[0]
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update book'
        });
    }
});

// ============================================
// DELETE /api/books/:id - Delete book
// ============================================

router.delete('/:id', async (req, res) => {
    try {
        // Check if book exists
        const checkResult = await pool.query('SELECT * FROM books WHERE id = $1', [req.params.id]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Book not found' 
            });
        }
        
        const deletedBook = checkResult.rows[0];
        
        // Delete book from database
        await pool.query('DELETE FROM books WHERE id = $1', [req.params.id]);
        
        res.json({
            success: true,
            message: 'Book deleted successfully',
            book: deletedBook
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete book'
        });
    }
});

module.exports = router;
