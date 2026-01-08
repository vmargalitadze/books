// ============================================
// Images Routes
// ============================================

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { pool } = require('../config/database');
const { uploadToSupabase, deleteFromSupabase, listImagesFromSupabase, listAllImagesFromSupabase } = require('../config/supabase');

// ============================================
// Multer Configuration
// ============================================

// Configure multer to use memory storage (for Supabase)
const storage = multer.memoryStorage();

// File filter - only images
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        const error = new Error('Only image files are allowed! (JPEG, JPG, PNG, GIF, WEBP)');
        error.code = 'INVALID_FILE_TYPE';
        cb(error, false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max per file
    },
    fileFilter: fileFilter
});

// ============================================
// Error Handling Middleware
// ============================================

const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                success: false,
                error: 'File too large. Maximum size is 10MB per file.' 
            });
        }
        return res.status(400).json({ 
            success: false,
            error: `Upload error: ${err.message}` 
        });
    }
    
    if (err) {
        if (err.code === 'INVALID_FILE_TYPE') {
            return res.status(400).json({ 
                success: false,
                error: err.message 
            });
        }
        return res.status(500).json({ 
            success: false,
            error: err.message || 'Upload failed' 
        });
    }
    
    next();
};

// ============================================
// GET /api/images - Get all images
// ============================================

router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM images ORDER BY created_at DESC');
        
        res.json({
            success: true,
            count: result.rows.length,
            images: result.rows
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch images'
        });
    }
});

// ============================================
// GET /api/images/:id - Get single image by ID
// ============================================

router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM images WHERE id = $1', [req.params.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Image not found' 
            });
        }
        
        res.json({
            success: true,
            image: result.rows[0]
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch image'
        });
    }
});

// ============================================
// POST /api/images - Create new image (with file upload)
// ============================================

router.post('/', upload.single('image'), handleMulterError, async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name) {
            return res.status(400).json({ 
                success: false,
                error: 'Name is required' 
            });
        }

        let imageUrl = null;
        let filePath = null;

        // If file is uploaded, upload to Supabase
        if (req.file) {
            const uploadResult = await uploadToSupabase(req.file, 'admin-images');
            imageUrl = uploadResult.url;
            filePath = uploadResult.filePath;
        } else {
            return res.status(400).json({ 
                success: false,
                error: 'Image file is required' 
            });
        }

        // Insert into database
        const result = await pool.query(
            'INSERT INTO images (name, image_url) VALUES ($1, $2) RETURNING *',
            [name, imageUrl]
        );
        
        res.status(201).json({
            success: true,
            message: 'Image created successfully',
            image: result.rows[0]
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create image'
        });
    }
});

// ============================================
// PUT /api/images/:id - Update image
// ============================================

router.put('/:id', upload.single('image'), handleMulterError, async (req, res) => {
    try {
        const { name } = req.body;
        
        // Check if image exists
        const checkResult = await pool.query('SELECT * FROM images WHERE id = $1', [req.params.id]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Image not found' 
            });
        }

        const existingImage = checkResult.rows[0];
        let imageUrl = existingImage.image_url;
        let oldFilePath = null;

        // If new file is uploaded, upload to Supabase and delete old file
        if (req.file) {
            // Extract old file path from URL if possible
            if (existingImage.image_url) {
                const urlParts = existingImage.image_url.split('/');
                const fileName = urlParts[urlParts.length - 1];
                oldFilePath = `admin-images/${fileName}`;
            }

            const uploadResult = await uploadToSupabase(req.file, 'admin-images');
            imageUrl = uploadResult.url;

            // Delete old file from Supabase if it exists
            if (oldFilePath) {
                try {
                    await deleteFromSupabase(oldFilePath);
                } catch (deleteError) {
                    console.warn('Could not delete old file:', deleteError.message);
                }
            }
        }

        // Update database
        const result = await pool.query(
            `UPDATE images 
             SET name = COALESCE($1, name), 
                 image_url = COALESCE($2, image_url),
                 updated_at = CURRENT_TIMESTAMP 
             WHERE id = $3 
             RETURNING *`,
            [
                name || existingImage.name,
                imageUrl,
                req.params.id
            ]
        );
        
        res.json({
            success: true,
            message: 'Image updated successfully',
            image: result.rows[0]
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update image'
        });
    }
});

// ============================================
// DELETE /api/images/:id - Delete image
// ============================================

router.delete('/:id', async (req, res) => {
    try {
        // Check if image exists
        const checkResult = await pool.query('SELECT * FROM images WHERE id = $1', [req.params.id]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Image not found' 
            });
        }

        const deletedImage = checkResult.rows[0];
        
        // Delete file from Supabase if URL exists
        if (deletedImage.image_url) {
            try {
                const urlParts = deletedImage.image_url.split('/');
                const fileName = urlParts[urlParts.length - 1];
                const filePath = `admin-images/${fileName}`;
                await deleteFromSupabase(filePath);
            } catch (deleteError) {
                console.warn('Could not delete file from Supabase:', deleteError.message);
            }
        }
        
        // Delete image from database
        await pool.query('DELETE FROM images WHERE id = $1', [req.params.id]);
        
        res.json({
            success: true,
            message: 'Image deleted successfully',
            image: deletedImage
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete image'
        });
    }
});

// ============================================
// GET /api/images/backgrounds - Get background images
// ============================================

router.get('/backgrounds', async (req, res) => {
    try {
        const folder = req.query.folder || 'backgrounds';
        const limit = parseInt(req.query.limit) || 100;
        
        const result = await listImagesFromSupabase(folder, limit);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error fetching background images:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch background images'
        });
    }
});

// ============================================
// GET /api/images/supabase/all - Get all images from Supabase
// ============================================

router.get('/supabase/all', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        
        const result = await listAllImagesFromSupabase(limit);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error fetching all images from Supabase:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch images from Supabase'
        });
    }
});

module.exports = router;

