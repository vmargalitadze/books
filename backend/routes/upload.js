// ============================================
// Upload Routes
// ============================================

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadToSupabase } = require('../config/supabase');

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
        console.log(`File accepted: ${file.originalname} (${file.mimetype})`);
        return cb(null, true);
    } else {
        const error = new Error('Only image files are allowed! (JPEG, JPG, PNG, GIF, WEBP)');
        error.code = 'INVALID_FILE_TYPE';
        console.log(`File rejected: ${file.originalname} (${file.mimetype})`);
        cb(error, false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max per file
        files: 10 // Max 10 files
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
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ 
                success: false,
                error: 'Too many files. Maximum 10 files allowed.' 
            });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ 
                success: false,
                error: 'Unexpected file field name.' 
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
// POST /api/upload/single - Upload single image
// ============================================

router.post('/single', upload.single('image'), handleMulterError, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                error: 'No file uploaded. Please select an image file.' 
            });
        }

        console.log(`Uploading file to Supabase: ${req.file.originalname}`);

        // Upload to Supabase Storage
        const uploadResult = await uploadToSupabase(req.file);

        console.log(`File uploaded to Supabase: ${uploadResult.url}`);

        res.status(200).json({
            success: true,
            message: 'File uploaded and saved successfully to Supabase',
            file: {
                filename: uploadResult.fileName,
                originalName: req.file.originalname,
                size: uploadResult.size,
                mimetype: uploadResult.mimetype,
                path: uploadResult.filePath,
                url: uploadResult.url
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message || 'Failed to upload file to Supabase' 
        });
    }
});

// ============================================
// POST /api/upload/multiple - Upload multiple images
// ============================================

router.post('/multiple', upload.array('images', 10), handleMulterError, async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ 
                success: false,
                error: 'No files uploaded. Please select at least one image file.' 
            });
        }

        console.log(`Uploading ${req.files.length} file(s) to Supabase...`);

        // Upload all files to Supabase
        const uploadPromises = req.files.map(file => uploadToSupabase(file));
        const uploadResults = await Promise.all(uploadPromises);

        console.log(`Successfully uploaded ${uploadResults.length} file(s) to Supabase`);

        const files = uploadResults.map((result, index) => ({
            filename: result.fileName,
            originalName: result.originalName || req.files[index]?.originalname || result.fileName,
            size: result.size,
            mimetype: result.mimetype,
            path: result.filePath,
            url: result.url
        }));

        res.status(200).json({
            success: true,
            message: `${files.length} file(s) uploaded and saved successfully to Supabase`,
            count: files.length,
            files: files
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message || 'Failed to upload files to Supabase' 
        });
    }
});

module.exports = router;
