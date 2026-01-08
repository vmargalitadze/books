<<<<<<< HEAD
// ============================================
// AI Routes
// ============================================

const express = require('express');
const router = express.Router();
const {
    generateText,
    chat,
    generateFairyTaleCharacters,
    replaceChildInTemplate,
    analyzeSupabaseImages,
    analyzeSupabaseImageByPath
} = require('../config/openai');

// ============================================
// POST /api/ai/generate - Generate text with AI
// ============================================

router.post('/generate', async (req, res) => {
    try {
        const { prompt, model, temperature, maxOutputTokens } = req.body;
        
        if (!prompt) {
            return res.status(400).json({
                success: false,
                error: 'Prompt is required'
            });
        }
        
        const options = {
            model: model || 'gpt-4o-mini',
            temperature: temperature,
            maxOutputTokens: maxOutputTokens
        };
        
        const result = await generateText(prompt, options);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('AI generation error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate text'
        });
    }
});

// ============================================
// POST /api/ai/chat - Chat with AI (with conversation history)
// ============================================

router.post('/chat', async (req, res) => {
    try {
        const { message, history, model, temperature, maxOutputTokens } = req.body;
        
        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }
        
        const options = {
            model: model || 'gpt-4o',
            history: history || [],
            temperature: temperature,
            maxOutputTokens: maxOutputTokens
        };
        
        const result = await chat(message, options);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('AI chat error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to chat with AI'
        });
    }
});

// ============================================
// POST /api/ai/complete - Complete text with AI
// ============================================

router.post('/complete', async (req, res) => {
    try {
        const { text } = req.body;
        
        if (!text) {
            return res.status(400).json({
                success: false,
                error: 'Text is required'
            });
        }
        
        const prompt = `Complete the following text: ${text}`;
        const result = await generateText(prompt);
        
        res.json({
            success: true,
            original: text,
            completion: result.text
        });
    } catch (error) {
        console.error('AI completion error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to complete text'
        });
    }
});

// ============================================
// POST /api/ai/fairy-tale-characters - Generate fairy tale characters
// ============================================

router.post('/fairy-tale-characters', async (req, res) => {
    try {
        const { imageUrls, model, backgroundImageUrl } = req.body;
        
        if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Image URLs array is required'
            });
        }
        
        const options = {
            model: model || 'gpt-4o',
            backgroundImageUrl: backgroundImageUrl || null
        };
        
        const result = await generateFairyTaleCharacters(imageUrls, options);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Fairy tale character generation error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate fairy tale characters'
        });
    }
});

// ============================================
// POST /api/ai/replace-child - Replace child in template image
// ============================================

router.post('/replace-child', async (req, res) => {
    try {
        const { childImageUrl, templateImageUrl, model } = req.body;
        
        if (!childImageUrl) {
            return res.status(400).json({
                success: false,
                error: 'Child image URL is required'
            });
        }
        
        if (!templateImageUrl) {
            return res.status(400).json({
                success: false,
                error: 'Template image URL is required'
            });
        }
        
        const options = {
            model: model || 'gpt-4o'
        };
        
        const result = await replaceChildInTemplate(childImageUrl, templateImageUrl, options);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Child replacement error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to replace child in template'
        });
    }
});

// ============================================
// POST /api/ai/analyze-supabase-images - Analyze images from Supabase
// ============================================

router.post('/analyze-supabase-images', async (req, res) => {
    try {
        const { folder, model, prompt, limit, delayBetweenRequests, maxTokens } = req.body;
        
        const options = {
            model: model || 'gpt-4o-mini',
            prompt: prompt,
            limit: limit || 100,
            delayBetweenRequests: delayBetweenRequests || 2000, // 2 seconds default
            maxTokens: maxTokens || 500
        };
        
        const result = await analyzeSupabaseImages(folder || null, options);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Supabase images analysis error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to analyze Supabase images'
        });
    }
});

// ============================================
// POST /api/ai/analyze-supabase-image - Analyze single image from Supabase
// ============================================

router.post('/analyze-supabase-image', async (req, res) => {
    try {
        const { imagePath, model, prompt, maxTokens } = req.body;
        
        if (!imagePath) {
            return res.status(400).json({
                success: false,
                error: 'Image path is required'
            });
        }
        
        const options = {
            model: model || 'gpt-4o-mini',
            prompt: prompt,
            maxTokens: maxTokens || 500
        };
        
        const result = await analyzeSupabaseImageByPath(imagePath, options);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Supabase image analysis error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to analyze Supabase image'
        });
    }
});

module.exports = router;

=======
const express = require('express');
const router = express.Router();
const { 
    generateText, 
    chat, 
    generateFairyTaleCharacters, 
    replaceChildInTemplate,
    generateFairyTaleCharactersFromDatabase,
    analyzeAndGenerateFromDatabase,
    replaceChildInTemplateFromDatabase
} = require('../config/googleai');

// Generate text with Google AI
router.post('/generate', async (req, res) => {
    try {
        const { prompt, model, temperature, maxOutputTokens } = req.body;
        
        if (!prompt) {
            return res.status(400).json({
                success: false,
                error: 'Prompt is required'
            });
        }
        
        const options = {
            model: model || 'gemini-2.5-flash',
            temperature: temperature,
            maxOutputTokens: maxOutputTokens
        };
        
        const result = await generateText(prompt, options);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('AI generation error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate text'
        });
    }
});

// Chat with Google AI (with conversation history)
router.post('/chat', async (req, res) => {
    try {
        const { message, history, model, temperature, maxOutputTokens } = req.body;
        
        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }
        
        const options = {
            model: model || 'gemini-2.5-flash',
            history: history || [],
            temperature: temperature,
            maxOutputTokens: maxOutputTokens
        };
        
        const result = await chat(message, options);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('AI chat error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to chat with AI'
        });
    }
});

// Simple text completion endpoint
router.post('/complete', async (req, res) => {
    try {
        const { text } = req.body;
        
        if (!text) {
            return res.status(400).json({
                success: false,
                error: 'Text is required'
            });
        }
        
        const prompt = `Complete the following text: ${text}`;
        const result = await generateText(prompt);
        
        res.json({
            success: true,
            original: text,
            completion: result.text
        });
    } catch (error) {
        console.error('AI completion error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to complete text'
        });
    }
});

// Generate fairy tale characters from uploaded images
router.post('/fairy-tale-characters', async (req, res) => {
    try {
        const { imageUrls, model, backgroundImageUrl } = req.body;
        
        if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Image URLs array is required'
            });
        }
        
        const options = {
            model: model || 'gemini-2.5-flash',
            backgroundImageUrl: backgroundImageUrl || null
        };
        
        const result = await generateFairyTaleCharacters(imageUrls, options);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Fairy tale character generation error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate fairy tale characters'
        });
    }
});

// Replace child in template image with uploaded child photo
router.post('/replace-child', async (req, res) => {
    try {
        const { childImageUrl, templateImageUrl, model } = req.body;
        
        if (!childImageUrl) {
            return res.status(400).json({
                success: false,
                error: 'Child image URL is required'
            });
        }
        
        if (!templateImageUrl) {
            return res.status(400).json({
                success: false,
                error: 'Template image URL is required'
            });
        }
        
        const options = {
            model: model || 'gemini-2.5-flash'
        };
        
        const result = await replaceChildInTemplate(childImageUrl, templateImageUrl, options);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Child replacement error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to replace child in template'
        });
    }
});

// ============================================
// NEW ENDPOINTS: Google AI with Neon Database
// ============================================

// Generate fairy tale characters from images stored in Neon database
router.post('/fairy-tale-characters-from-db', async (req, res) => {
    try {
        const { imageIds, model, backgroundImageId } = req.body;
        
        if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Image IDs array is required'
            });
        }
        
        const options = {
            model: model || 'gemini-2.5-flash',
            backgroundImageId: backgroundImageId || null
        };
        
        // If backgroundImageId is provided, we need to fetch it and pass the URL
        if (backgroundImageId) {
            const { getImageById } = require('../config/database');
            const backgroundImage = await getImageById(backgroundImageId);
            options.backgroundImageUrl = backgroundImage.image_url;
        }
        
        const result = await generateFairyTaleCharactersFromDatabase(imageIds, options);
        
        res.json({
            success: true,
            data: result,
            message: `Processed ${imageIds.length} image(s) from Neon database`
        });
    } catch (error) {
        console.error('Fairy tale character generation from database error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate fairy tale characters from database'
        });
    }
});

// Analyze and generate from a single image stored in Neon database
router.post('/analyze-from-db', async (req, res) => {
    try {
        const { imageId, backgroundImageId, model } = req.body;
        
        if (!imageId) {
            return res.status(400).json({
                success: false,
                error: 'Image ID is required'
            });
        }
        
        const result = await analyzeAndGenerateFromDatabase(imageId, backgroundImageId || null);
        
        res.json({
            success: true,
            data: result,
            message: 'Image processed from Neon database successfully'
        });
    } catch (error) {
        console.error('Image analysis from database error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to analyze image from database'
        });
    }
});

// Replace child in template using images from Neon database
router.post('/replace-child-from-db', async (req, res) => {
    try {
        const { childImageId, templateImageId, model } = req.body;
        
        if (!childImageId) {
            return res.status(400).json({
                success: false,
                error: 'Child image ID is required'
            });
        }
        
        if (!templateImageId) {
            return res.status(400).json({
                success: false,
                error: 'Template image ID is required'
            });
        }
        
        const options = {
            model: model || 'gemini-2.5-flash'
        };
        
        const result = await replaceChildInTemplateFromDatabase(childImageId, templateImageId, options);
        
        res.json({
            success: true,
            data: result,
            message: 'Child replaced in template using images from Neon database'
        });
    } catch (error) {
        console.error('Child replacement from database error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to replace child in template from database'
        });
    }
});

module.exports = router;

>>>>>>> 38f815a0fdc04e3d7845f3e822a01a82cd35a6e1
