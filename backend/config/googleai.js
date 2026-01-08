const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getImageById, getImagesByIds } = require('./database');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Get a model instance
function getGoogleAIModel(modelName = 'gemini-2.5-flash') {
  return genAI.getGenerativeModel({ model: modelName });
}

// List available models
async function listModels() {
  try {
    // Note: The Google AI SDK doesn't have a direct listModels method
    // We'll return common models that are typically available
    const commonModels = [
      'gemini-2.5-flash',
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-pro'
    ];
    
    return {
      success: true,
      models: commonModels.map(name => ({ name }))
    };
  } catch (error) {
    console.error('Error listing models:', error);
    throw error;
  }
}

// Find a working model by testing common models
async function findWorkingModel() {
  const modelsToTest = [
    'gemini-2.5-flash',
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro',
    'gemini-1.0-pro'
  ];
  
  const errors = [];
  let tested = 0;
  
  for (const modelName of modelsToTest) {
    try {
      tested++;
      const model = getGoogleAIModel(modelName);
      const result = await model.generateContent('test');
      await result.response;
      
      // If we get here, the model works
      return {
        success: true,
        model: modelName,
        tested: tested
      };
    } catch (error) {
      errors.push({
        model: modelName,
        error: error.message || 'Unknown error'
      });
      // Continue to next model
    }
  }
  
  return {
    success: false,
    tested: tested,
    errors: errors
  };
}

// Generate text with Google AI
async function generateText(prompt, options = {}) {
  try {
    const modelName = options.model || 'gemini-2.5-flash';
    const model = getGoogleAIModel(modelName);
    
    const generationConfig = {};
    if (options.temperature !== undefined) {
      generationConfig.temperature = options.temperature;
    }
    if (options.maxOutputTokens !== undefined) {
      generationConfig.maxOutputTokens = options.maxOutputTokens;
    }
    
    const result = await retryWithBackoff(async () => {
      if (Object.keys(generationConfig).length > 0) {
        return await model.generateContent(prompt, { generationConfig });
      }
      return await model.generateContent(prompt);
    });
    
    const response = await result.response;
    const text = response.text();
    
    return {
      success: true,
      text: text,
      model: modelName
    };
  } catch (error) {
    console.error('Error generating text:', error);
    throw error;
  }
}

// Chat with Google AI (with conversation history)
async function chat(message, options = {}) {
  try {
    const modelName = options.model || 'gemini-2.5-flash';
    const model = getGoogleAIModel(modelName);
    
    const generationConfig = {};
    if (options.temperature !== undefined) {
      generationConfig.temperature = options.temperature;
    }
    if (options.maxOutputTokens !== undefined) {
      generationConfig.maxOutputTokens = options.maxOutputTokens;
    }
    
    // Build conversation history
    const history = options.history || [];
    const chatSession = model.startChat({ history: history });
    
    const result = await retryWithBackoff(async () => {
      if (Object.keys(generationConfig).length > 0) {
        return await chatSession.sendMessage(message, { generationConfig });
      }
      return await chatSession.sendMessage(message);
    });
    
    const response = await result.response;
    const text = response.text();
    
    return {
      success: true,
      text: text,
      model: modelName
    };
  } catch (error) {
    console.error('Error in chat:', error);
    throw error;
  }
}

// Helper function to sleep/delay
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry function with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // Check if it's a rate limit error (429)
      const isRateLimit = error.message && (
        error.message.includes('429') || 
        error.message.includes('quota') || 
        error.message.includes('rate limit') ||
        error.message.includes('Too Many Requests')
      );

      if (isRateLimit && attempt < maxRetries - 1) {
        // Extract retry delay from error message if available
        let delay = initialDelay * Math.pow(2, attempt);
        const retryMatch = error.message.match(/retry.*?(\d+)\s*s/i);
        if (retryMatch) {
          delay = parseInt(retryMatch[1]) * 1000 + 1000; // Add 1 second buffer
        }
        
        console.log(`Rate limit hit. Waiting ${delay/1000}s before retry ${attempt + 1}/${maxRetries}...`);
        await sleep(delay);
        continue;
      }
      
      throw error;
    }
  }
}

async function analyzeAndGenerate(imageUrl, backgroundImageUrl = null) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    console.log(`\n=== Starting analyzeAndGenerate ===`);
    console.log(`Child photo URL (IMAGE 2 - uploaded): ${imageUrl}`);
    console.log(`Background URL (IMAGE 1 - from Supabase): ${backgroundImageUrl || 'None'}`);
    
    // Fetch child photo (uploaded image) - this is IMAGE 2
    console.log(`\nFetching child photo (uploaded image) from: ${imageUrl}`);
    const res = await fetch(imageUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch child photo: ${res.status} ${res.statusText}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    console.log(`✓ Child photo fetched successfully, size: ${buffer.length} bytes`);

    // Fetch background image if provided - this is IMAGE 1
    let backgroundBuffer = null;
    let backgroundMimeType = 'image/jpeg';
    if (backgroundImageUrl) {
      console.log(`\nFetching background image (from Supabase) from: ${backgroundImageUrl}`);
      const bgRes = await fetch(backgroundImageUrl);
      if (!bgRes.ok) {
        console.warn(`⚠ Failed to fetch background image: ${bgRes.status} ${bgRes.statusText}`);
      } else {
        backgroundBuffer = Buffer.from(await bgRes.arrayBuffer());
        backgroundMimeType = bgRes.headers.get('content-type') || 'image/jpeg';
        console.log(`✓ Background image fetched successfully, size: ${backgroundBuffer.length} bytes`);
      }
    } else {
      console.log(`No background image provided - will use only child photo`);
    }

    console.log('Sending image to Gemini AI for analysis...');
    
    // Build content array for Gemini
    const contentArray = [];
    
    // Add prompt
    let prompt = `
You are analyzing a REAL PHOTO of a child that was UPLOADED BY THE USER. This is the child that MUST be used in the final result.

CRITICAL REQUIREMENTS - READ CAREFULLY:
1. You MUST use the EXACT child from the uploaded photo
2. The child's face, hair, clothing, and ALL features from the uploaded photo must be accurately represented in the final image
3. DO NOT create a generic child - you MUST use the specific child from the uploaded photo

DETAILED ANALYSIS REQUIRED:
- Describe the child's face in EXACT detail: facial features, expression, hair color and style
- Describe the child's clothing, colors, and any accessories EXACTLY as shown
- Note the child's pose, body position, and expression
- Describe skin tone, eye color, and any distinctive features
- This child's appearance MUST be preserved in the final generated image

Create a detailed image generation prompt that will:
1. Create a storybook illustration of a fantasy character based on THIS SPECIFIC CHILD from the uploaded photo
2. The character MUST have the EXACT appearance from the uploaded photo: same face, same hair, same clothing, same features
3. Transform the child into a fairy tale character while preserving their exact appearance
4. Use cute cartoon style, pastel colors, hand drawn, NOT realistic, safe for children
5. The final image must show the EXACT child from the uploaded photo as a fairy tale character

IMPORTANT REMINDERS:
- This is a REAL PHOTO uploaded by the user - you MUST use this child's exact appearance
- Do NOT create a generic or different child - use the specific child from the uploaded photo
- The output must be a complete image generation prompt that will create a new image showing the EXACT child from the uploaded photo as a fairy tale character
`;
    
    // If background is provided, update prompt
    if (backgroundImageUrl && backgroundBuffer) {
      prompt = `
You are analyzing two images for image generation. Pay close attention to which image is which:

THE FIRST IMAGE YOU WILL SEE (IMAGE 1): This is a background scene/template image from Supabase storage. This is the BACKGROUND that should be preserved.

THE SECOND IMAGE YOU WILL SEE (IMAGE 2): This is a REAL PHOTO of a child that was UPLOADED BY THE USER. This is the child that MUST be used in the final result.

CRITICAL REQUIREMENTS - READ CAREFULLY:
1. You MUST use the EXACT child from the SECOND image (IMAGE 2 - the uploaded real photo)
2. The child's face, hair, clothing, and ALL features from IMAGE 2 (the uploaded photo) must be accurately represented in the final image
3. Place the child from IMAGE 2 into the background from IMAGE 1
4. Keep ALL elements from IMAGE 1 (the first image - background) exactly as they are (background, objects, text, decorations, style, colors)
5. The child from IMAGE 2 (the uploaded photo) should replace any existing child/character in IMAGE 1
6. DO NOT create a generic child - you MUST use the specific child from IMAGE 2 (the uploaded photo)

DETAILED ANALYSIS REQUIRED:

IMAGE 1 (Background) Analysis:
- Describe every element: background scene, objects, animals, text, decorations
- Note the exact color palette, artistic style, mood, lighting
- Describe the composition, layout, and positioning
- If there is a child/character in IMAGE 1, note their position and pose
- List ALL text or writing that appears in the image

IMAGE 2 (Uploaded Child Photo - THE SECOND IMAGE) Analysis:
- This is the REAL PHOTO uploaded by the user - you MUST use this child
- Describe the child's face in EXACT detail: facial features, expression, hair color and style
- Describe the child's clothing, colors, and any accessories EXACTLY as shown
- Note the child's pose, body position, and expression
- Describe skin tone, eye color, and any distinctive features
- This child's appearance MUST be preserved in the final generated image

INTEGRATION PROMPT CREATION:
Create a detailed image generation prompt that will:
1. Recreate the EXACT background scene from IMAGE 1 (the first image - all elements, colors, style, text must be preserved)
2. Place the child from IMAGE 2 (the second image - the uploaded photo) into this scene
3. The child MUST have the EXACT appearance from IMAGE 2 (the uploaded photo): same face, same hair, same clothing, same features
4. The child should be in the same position as any existing character in IMAGE 1
5. Maintain the artistic style and atmosphere of IMAGE 1
6. The child from IMAGE 2 should look natural and seamlessly integrated into IMAGE 1's background

IMPORTANT REMINDERS:
- IMAGE 1 (first image) = Background from Supabase - preserve everything
- IMAGE 2 (second image) = Child photo uploaded by user - use THIS child's exact appearance
- The final image must show the child from IMAGE 2 (uploaded photo) in the background from IMAGE 1
- Do NOT create a generic or different child - use the specific child from IMAGE 2

The output must be a complete image generation prompt that will create a new image showing the EXACT child from IMAGE 2 (the uploaded photo) placed into the scene from IMAGE 1 (the background), with all background elements preserved.
`;
    }
    
    contentArray.push(prompt);
    
    // Add background image first (if provided) - this is IMAGE 1
    if (backgroundImageUrl && backgroundBuffer) {
      console.log('\n📸 Adding background image (IMAGE 1 - from Supabase) to content array');
      contentArray.push({
        inlineData: {
          data: backgroundBuffer.toString('base64'),
          mimeType: backgroundMimeType
        }
      });
      console.log(`   Background image added (base64 length: ${backgroundBuffer.toString('base64').length})`);
    }
    
    // Add foreground image (child photo) - this is IMAGE 2 - THE UPLOADED IMAGE
    console.log('\n👶 Adding child photo (IMAGE 2 - UPLOADED BY USER) to content array');
    contentArray.push({
      inlineData: {
        data: buffer.toString('base64'),
        mimeType: 'image/jpeg'
      }
    });
    console.log(`   Child photo added (base64 length: ${buffer.toString('base64').length})`);
    
    console.log(`\n📤 Sending to Gemini AI:`);
    console.log(`   - 1 text prompt`);
    console.log(`   - ${contentArray.length - 1} image(s) (${backgroundImageUrl && backgroundBuffer ? 'Background + ' : ''}Child Photo)`);
    
    // Use retry logic for API calls
    const result = await retryWithBackoff(async () => {
      return await model.generateContent(contentArray);
    });

    const description = result.response.text().trim();
    console.log(`AI description received (full): ${description}`);
    console.log(`AI description length: ${description.length} characters`);

    // Generate illustration
    let imagePrompt = '';
    
    // If background was used, use the AI's detailed description directly
    if (backgroundImageUrl && backgroundBuffer) {
      // Use the AI's description directly as it should contain the full integration prompt
      imagePrompt = description || `storybook illustration, fairy tale character, cute cartoon style, pastel colors, hand drawn, safe for children`;
      
      // Add quality and style parameters to ensure good results
      if (!imagePrompt.includes('high quality')) {
        imagePrompt += `, high quality, detailed, professional illustration, storybook style, seamless integration`;
      }
      
      console.log('Using AI-generated integration prompt for image generation');
      console.log(`Final image generation prompt length: ${imagePrompt.length} characters`);
    } else {
      // No background - use the AI's description which should contain the child's exact appearance
      // The prompt already instructed AI to create a detailed prompt for the specific child
      imagePrompt = description || `storybook illustration of a fantasy character, cute cartoon style, pastel colors, hand drawn, NOT realistic, safe for children`;
      
      // Ensure quality parameters
      if (!imagePrompt.includes('high quality')) {
        imagePrompt += `, high quality, detailed, professional illustration, storybook style`;
      }
      
      console.log('Using AI-generated prompt for child-only character generation');
      console.log(`Final image generation prompt length: ${imagePrompt.length} characters`);
    }
    
    // Final safety check - ensure imagePrompt is not empty
    if (!imagePrompt || imagePrompt.trim().length === 0) {
      imagePrompt = `storybook illustration of a fantasy character, cute cartoon style, pastel colors, hand drawn, NOT realistic, safe for children, high quality, detailed, professional illustration`;
      console.warn('⚠ Image prompt was empty, using fallback prompt');
    }

    const imageUrlGenerated =
      `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=1024&height=1024&nologo=true&enhance=true`;

    console.log(`Generated image URL: ${imageUrlGenerated.substring(0, 100)}...`);

    return {
      success: true,
      generatedImageUrl: imageUrlGenerated,
      backgroundUsed: !!backgroundImageUrl
    };
  } catch (error) {
    console.error('Error in analyzeAndGenerate:', error);
    throw error;
  }
}

async function generateFairyTaleCharacters(imageUrls, options = {}) {
  const characters = [];
  const delayBetweenRequests = 2000; // 2 seconds delay between requests to avoid rate limits
  const backgroundImageUrl = options.backgroundImageUrl || null;

  console.log(`Generating characters for ${imageUrls.length} images...`);
  if (backgroundImageUrl) {
    console.log(`Using background image from Supabase: ${backgroundImageUrl}`);
  }

  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    try {
      console.log(`Processing image ${i + 1}/${imageUrls.length}: ${url}`);
      
      // Add delay between requests (except for the first one)
      if (i > 0) {
        console.log(`Waiting ${delayBetweenRequests/1000}s before next request to avoid rate limits...`);
        await sleep(delayBetweenRequests);
      }
      
      const result = await analyzeAndGenerate(url, backgroundImageUrl);
      characters.push(result);
      console.log(`Successfully generated character ${i + 1}`);
    } catch (e) {
      console.error(`Failed to generate character ${i + 1}:`, e.message);
      
      // Check if it's a quota exceeded error
      const isQuotaExceeded = e.message && (
        e.message.includes('quota') || 
        e.message.includes('Quota exceeded') ||
        e.message.includes('429')
      );
      
      characters.push({ 
        success: false, 
        error: isQuotaExceeded 
          ? 'API quota exceeded. Please try again later or upgrade your plan.'
          : e.message || 'Unknown error',
        imageUrl: url
      });
    }
  }

  console.log(`Generated ${characters.filter(c => c.success).length}/${imageUrls.length} characters successfully`);

  return {
    success: true,
    characters,
    backgroundUsed: !!backgroundImageUrl
  };
}

// Replace child in template image with uploaded child photo
async function replaceChildInTemplate(childImageUrl, templateImageUrl, options = {}) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    console.log(`Fetching child image from: ${childImageUrl}`);
    console.log(`Fetching template image from: ${templateImageUrl}`);

    // Fetch both images
    const childRes = await fetch(childImageUrl);
    if (!childRes.ok) {
      throw new Error(`Failed to fetch child image: ${childRes.status} ${childRes.statusText}`);
    }
    const childBuffer = Buffer.from(await childRes.arrayBuffer());
    const childMimeType = childRes.headers.get('content-type') || 'image/jpeg';

    const templateRes = await fetch(templateImageUrl);
    if (!templateRes.ok) {
      throw new Error(`Failed to fetch template image: ${templateRes.status} ${templateRes.statusText}`);
    }
    const templateBuffer = Buffer.from(await templateRes.arrayBuffer());
    const templateMimeType = templateRes.headers.get('content-type') || 'image/jpeg';

    console.log('Analyzing images with Gemini AI...');

    // Use retry logic for API calls
    const result = await retryWithBackoff(async () => {
      return await model.generateContent([
        `You are analyzing two images:
1. A template illustration of a children's birthday book cover showing a baby boy in a forest scene with animals (bear, squirrel, fox, rabbit) and Georgian text "სანის პირველი დაბადების დღე" at the top.
2. A real photo of a child.

Your task:
- Analyze the template image: describe the scene, composition, colors, style, position of the child, background elements, animals, and text placement.
- Analyze the child photo: describe the child's appearance, facial features, hair color, clothing, pose, and expression.
- Create a detailed prompt for generating a new image that places the child from the photo into the template scene, maintaining the same artistic style, composition, and all elements (animals, forest, text) exactly as in the template, but with the new child replacing the original child in the same position and pose.

The output should be a detailed image generation prompt that will recreate the entire scene with the new child seamlessly integrated.`,
        {
          inlineData: {
            data: templateBuffer.toString('base64'),
            mimeType: templateMimeType
          }
        },
        {
          inlineData: {
            data: childBuffer.toString('base64'),
            mimeType: childMimeType
          }
        }
      ]);
    });

    const prompt = result.response.text().trim();
    console.log(`Generated prompt: ${prompt.substring(0, 200)}...`);

    // Generate the final image using Pollinations
    const imageUrlGenerated =
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&enhance=true`;

    console.log(`Generated image URL: ${imageUrlGenerated}`);

    return {
      success: true,
      generatedImageUrl: imageUrlGenerated,
      prompt: prompt
    };
  } catch (error) {
    console.error('Error in replaceChildInTemplate:', error);
    throw error;
  }
}

// Generate fairy tale characters from images stored in Neon database
async function generateFairyTaleCharactersFromDatabase(imageIds, options = {}) {
  try {
    // Fetch images from database
    const images = await getImagesByIds(imageIds);
    
    if (images.length === 0) {
      throw new Error('No images found in database with the provided IDs');
    }
    
    // Extract image URLs from database records
    const imageUrls = images.map(img => img.image_url);
    
    console.log(`Fetched ${images.length} images from Neon database`);
    console.log(`Image IDs: ${imageIds.join(', ')}`);
    
    // Use existing function with the URLs
    return await generateFairyTaleCharacters(imageUrls, options);
  } catch (error) {
    console.error('Error generating characters from database:', error);
    throw error;
  }
}

// Analyze and generate from a single image stored in Neon database
async function analyzeAndGenerateFromDatabase(imageId, backgroundImageId = null) {
  try {
    // Fetch child image from database
    const childImage = await getImageById(imageId);
    const childImageUrl = childImage.image_url;
    
    console.log(`Fetched child image from Neon database: ID ${imageId}, URL: ${childImageUrl}`);
    
    // Fetch background image from database if provided
    let backgroundImageUrl = null;
    if (backgroundImageId) {
      const backgroundImage = await getImageById(backgroundImageId);
      backgroundImageUrl = backgroundImage.image_url;
      console.log(`Fetched background image from Neon database: ID ${backgroundImageId}, URL: ${backgroundImageUrl}`);
    }
    
    // Use existing function with the URLs
    return await analyzeAndGenerate(childImageUrl, backgroundImageUrl);
  } catch (error) {
    console.error('Error analyzing image from database:', error);
    throw error;
  }
}

// Replace child in template using images from Neon database
async function replaceChildInTemplateFromDatabase(childImageId, templateImageId, options = {}) {
  try {
    // Fetch both images from database
    const [childImage, templateImage] = await Promise.all([
      getImageById(childImageId),
      getImageById(templateImageId)
    ]);
    
    console.log(`Fetched child image from Neon database: ID ${childImageId}`);
    console.log(`Fetched template image from Neon database: ID ${templateImageId}`);
    
    // Use existing function with the URLs
    return await replaceChildInTemplate(childImage.image_url, templateImage.image_url, options);
  } catch (error) {
    console.error('Error replacing child in template from database:', error);
    throw error;
  }
}

module.exports = { 
  generateFairyTaleCharacters, 
  replaceChildInTemplate,
  generateFairyTaleCharactersFromDatabase,
  analyzeAndGenerateFromDatabase,
  replaceChildInTemplateFromDatabase,
  getGoogleAIModel,
  generateText,
  chat,
  findWorkingModel,
  listModels
};
