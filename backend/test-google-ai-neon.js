/**
 * Test script for Google AI + Neon Database integration
 * 
 * This script demonstrates how to use the new endpoints that fetch images
 * from Neon database and process them with Google AI Studio.
 * 
 * Usage:
 *   node test-google-ai-neon.js
 */

require('dotenv').config();
const { pool, getImageById, getImagesByIds, getAllImages } = require('./config/database');
const { 
    generateFairyTaleCharactersFromDatabase,
    analyzeAndGenerateFromDatabase,
    replaceChildInTemplateFromDatabase
} = require('./config/googleai');

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

async function testDatabaseConnection() {
    console.log('\n=== Testing Neon Database Connection ===');
    try {
        const result = await pool.query('SELECT NOW()');
        console.log('✅ Database connection successful');
        console.log('   Current time:', result.rows[0].now);
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
}

async function testGetImages() {
    console.log('\n=== Testing Image Retrieval from Neon Database ===');
    try {
        // Get all images
        const allImages = await getAllImages(5);
        console.log(`✅ Found ${allImages.length} images in database`);
        
        if (allImages.length > 0) {
            console.log('\nSample images:');
            allImages.forEach(img => {
                console.log(`   - ID: ${img.id}, Name: ${img.name}, URL: ${img.image_url.substring(0, 50)}...`);
            });
            
            // Test getting single image
            const firstImage = await getImageById(allImages[0].id);
            console.log(`\n✅ Retrieved single image: ${firstImage.name}`);
            
            // Test getting multiple images
            if (allImages.length > 1) {
                const ids = allImages.slice(0, 2).map(img => img.id);
                const multipleImages = await getImagesByIds(ids);
                console.log(`✅ Retrieved ${multipleImages.length} images by IDs: ${ids.join(', ')}`);
            }
            
            return allImages;
        } else {
            console.log('⚠️  No images found in database. Please add some images first.');
            return [];
        }
    } catch (error) {
        console.error('❌ Error retrieving images:', error.message);
        return [];
    }
}

async function testAnalyzeFromDatabase(imageId) {
    console.log('\n=== Testing analyzeAndGenerateFromDatabase ===');
    try {
        console.log(`Processing image ID: ${imageId}`);
        const result = await analyzeAndGenerateFromDatabase(imageId, null);
        console.log('✅ Analysis successful');
        console.log('   Generated image URL:', result.generatedImageUrl.substring(0, 80) + '...');
        return result;
    } catch (error) {
        console.error('❌ Analysis failed:', error.message);
        return null;
    }
}

async function testFairyTaleCharactersFromDatabase(imageIds) {
    console.log('\n=== Testing generateFairyTaleCharactersFromDatabase ===');
    try {
        console.log(`Processing image IDs: ${imageIds.join(', ')}`);
        const result = await generateFairyTaleCharactersFromDatabase(imageIds, {});
        console.log('✅ Generation successful');
        console.log(`   Generated ${result.characters.filter(c => c.success).length} characters`);
        return result;
    } catch (error) {
        console.error('❌ Generation failed:', error.message);
        return null;
    }
}

async function testReplaceChildFromDatabase(childImageId, templateImageId) {
    console.log('\n=== Testing replaceChildInTemplateFromDatabase ===');
    try {
        console.log(`Child image ID: ${childImageId}, Template image ID: ${templateImageId}`);
        const result = await replaceChildInTemplateFromDatabase(childImageId, templateImageId, {});
        console.log('✅ Replacement successful');
        console.log('   Generated image URL:', result.generatedImageUrl.substring(0, 80) + '...');
        return result;
    } catch (error) {
        console.error('❌ Replacement failed:', error.message);
        return null;
    }
}

async function testAPIEndpoints(images) {
    console.log('\n=== Testing API Endpoints ===');
    
    if (images.length === 0) {
        console.log('⚠️  Skipping API tests - no images available');
        return;
    }
    
    console.log('\n📝 To test API endpoints, use curl or Postman:');
    console.log(`\n   curl -X POST ${BASE_URL}/api/ai/analyze-from-db \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"imageId": ${images[0].id}}'`);
    console.log(`\n   Or test in your browser/frontend application.`);
}

async function main() {
    console.log('🚀 Starting Google AI + Neon Database Integration Tests\n');
    console.log('='.repeat(60));
    
    // Test database connection
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
        console.log('\n❌ Cannot proceed without database connection');
        process.exit(1);
    }
    
    // Test image retrieval
    const images = await testGetImages();
    
    if (images.length === 0) {
        console.log('\n⚠️  No images found. Please add images to the database first.');
        console.log('   You can use the /api/images endpoint to upload images.');
        process.exit(0);
    }
    
    // Test direct function calls (if GOOGLE_API_KEY is set)
    if (process.env.GOOGLE_API_KEY) {
        console.log('\n✅ GOOGLE_API_KEY found - testing AI functions');
        
        // Test analyze from database
        await testAnalyzeFromDatabase(images[0].id);
        
        // Test fairy tale characters (if multiple images available)
        if (images.length > 1) {
            const imageIds = images.slice(0, Math.min(2, images.length)).map(img => img.id);
            await testFairyTaleCharactersFromDatabase(imageIds);
        }
        
        // Test replace child (if multiple images available)
        if (images.length >= 2) {
            await testReplaceChildFromDatabase(images[0].id, images[1].id);
        }
    } else {
        console.log('\n⚠️  GOOGLE_API_KEY not set - skipping AI function tests');
        console.log('   Set GOOGLE_API_KEY in .env to test AI functions');
    }
    
    // Test API endpoints
    await testAPIEndpoints(images);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Tests completed');
    console.log('\n📚 See backend/GOOGLE-AI-NEON-INTEGRATION.md for full documentation');
    
    process.exit(0);
}

// Run tests
main().catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
});

