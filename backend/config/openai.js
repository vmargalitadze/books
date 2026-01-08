const OpenAI = require('openai');
require('dotenv').config();
const { getSupabaseClient, listImagesFromSupabase, listAllImagesFromSupabase } = require('./supabase');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Get OpenAI model instance
function getOpenAIModel(modelName = 'gpt-4o-mini') {
  return modelName;
}

// List available models
async function listModels() {
  try {
    const commonModels = [
      'gpt-4o-mini',
      'gpt-4o',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo'
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
    'gpt-4o-mini',
    'gpt-4o',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo'
  ];
  
  const errors = [];
  let tested = 0;
  
  for (const modelName of modelsToTest) {
    try {
      tested++;
      const response = await openai.chat.completions.create({
        model: modelName,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5
      });
      
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
      const isRateLimit = error.status === 429 || 
        (error.message && (
          error.message.includes('429') || 
          error.message.includes('quota') || 
          error.message.includes('rate limit') ||
          error.message.includes('Too Many Requests')
        ));

      if (isRateLimit && attempt < maxRetries - 1) {
        // Extract retry delay from error message if available
        let delay = initialDelay * Math.pow(2, attempt);
        const retryAfter = error.headers?.['retry-after'];
        if (retryAfter) {
          delay = parseInt(retryAfter) * 1000 + 1000; // Add 1 second buffer
        }
        
        console.log(`Rate limit hit. Waiting ${delay/1000}s before retry ${attempt + 1}/${maxRetries}...`);
        await sleep(delay);
        continue;
      }
      
      throw error;
    }
  }
}

// Generate text with OpenAI
async function generateText(prompt, options = {}) {
  try {
    const modelName = options.model || 'gpt-4o-mini';
    
    const requestOptions = {
      model: modelName,
      messages: [{ role: 'user', content: prompt }]
    };
    
    if (options.temperature !== undefined) {
      requestOptions.temperature = options.temperature;
    }
    if (options.maxOutputTokens !== undefined) {
      requestOptions.max_tokens = options.maxOutputTokens;
    }
    
    const result = await retryWithBackoff(async () => {
      return await openai.chat.completions.create(requestOptions);
    });
    
    const text = result.choices[0].message.content;
    
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

// Chat with OpenAI (with conversation history)
async function chat(message, options = {}) {
  try {
    const modelName = options.model || 'gpt-4o-mini';
    
    const requestOptions = {
      model: modelName,
      messages: []
    };
    
    // Build conversation history
    const history = options.history || [];
    history.forEach(msg => {
      requestOptions.messages.push({
        role: msg.role || 'user',
        content: msg.content || msg.text || msg.message
      });
    });
    
    // Add current message
    requestOptions.messages.push({
      role: 'user',
      content: message
    });
    
    if (options.temperature !== undefined) {
      requestOptions.temperature = options.temperature;
    }
    if (options.maxOutputTokens !== undefined) {
      requestOptions.max_tokens = options.maxOutputTokens;
    }
    
    const result = await retryWithBackoff(async () => {
      return await openai.chat.completions.create(requestOptions);
    });
    
    const text = result.choices[0].message.content;
    
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

async function analyzeAndGenerate(imageUrl, backgroundImageUrl = null) {
  try {
    console.log(`\n=== Starting analyzeAndGenerate ===`);
    console.log(`Child photo URL (IMAGE 2 - uploaded): ${imageUrl}`);
    console.log(`Background URL (IMAGE 1 - from Supabase): ${backgroundImageUrl || 'None'}`);
    
    // Fetch child photo (uploaded image) - this is IMAGE 2
    console.log(`\nFetching child photo (uploaded image) from: ${imageUrl}`);
    const res = await fetch(imageUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch child photo: ${res.status} ${res.statusText}`);
    }
    const childBuffer = Buffer.from(await res.arrayBuffer());
    console.log(`✓ Child photo fetched successfully, size: ${childBuffer.length} bytes`);

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

    console.log('Sending image to OpenAI for analysis...');
    
    // Build messages array for OpenAI
    const messages = [];
    
    // Add prompt
    let prompt = `
Describe the child in the image for a fairy tale illustration.
Cartoon style, soft colors, storybook illustration.
Do NOT include name or story.
`;
    
    // If background is provided, update prompt
    if (backgroundImageUrl && backgroundBuffer) {
      prompt = `
You are analyzing two images:

IMAGE 1 (first image): This is the BACKGROUND scene/template. DO NOT CHANGE ANYTHING in this image - keep it EXACTLY as is.
IMAGE 2 (second image): This is a REAL PHOTO of a child uploaded by the user. Use THIS child's exact appearance.

Your task:
1. Describe the child from IMAGE 2 in detail (face, hair, clothing, features, pose)
2. Create a SHORT image generation prompt that will:
   - Keep the EXACT background from IMAGE 1 (all colors, objects, animals, text, style - everything stays the same)
   - Replace ONLY the character/person in IMAGE 1 with the child from IMAGE 2
   - The child from IMAGE 2 should be in the same position as the character in IMAGE 1
   - Everything else in IMAGE 1 must remain EXACTLY the same

CRITICAL: The background, colors, objects, animals, text, and style from IMAGE 1 must be PRESERVED EXACTLY. Only the character/person should be replaced with the child from IMAGE 2.

Keep the prompt SHORT (max 300 words). Use simple, clear language.
Output ONLY the image generation prompt, nothing else.
`;
    }
    
    // Build content array with text and images
    const content = [
      { type: 'text', text: prompt }
    ];
    
    // Add background image first (if provided) - this is IMAGE 1
    if (backgroundImageUrl && backgroundBuffer) {
      console.log('\n📸 Adding background image (IMAGE 1 - from Supabase) to content array');
      content.push({
        type: 'image_url',
        image_url: {
          url: `data:${backgroundMimeType};base64,${backgroundBuffer.toString('base64')}`
        }
      });
      console.log(`   Background image added (base64 length: ${backgroundBuffer.toString('base64').length})`);
    }
    
    // Add foreground image (child photo) - this is IMAGE 2 - THE UPLOADED IMAGE
    console.log('\n👶 Adding child photo (IMAGE 2 - UPLOADED BY USER) to content array');
    content.push({
      type: 'image_url',
      image_url: {
        url: `data:image/jpeg;base64,${childBuffer.toString('base64')}`
      }
    });
    console.log(`   Child photo added (base64 length: ${childBuffer.toString('base64').length})`);
    
    console.log(`\n📤 Sending to OpenAI:`);
    console.log(`   - 1 text prompt`);
    console.log(`   - ${content.length - 1} image(s) (${backgroundImageUrl && backgroundBuffer ? 'Background + ' : ''}Child Photo)`);
    
    // Use retry logic for API calls
    const result = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model: 'gpt-4o-mini', // GPT-4o-mini supports vision
        messages: [
          {
            role: 'user',
            content: content
          }
        ],
        max_tokens: 1000
      });
    });

    const description = result.choices[0].message.content.trim();
    console.log(`AI description received (full): ${description}`);
    console.log(`AI description length: ${description.length} characters`);

    // Generate illustration (NO REAL PHOTO)
    let imagePrompt = `
storybook illustration of a fantasy character,
inspired by: ${description},
cute cartoon style, pastel colors,
hand drawn, NOT realistic, safe for children
`;

    // If background was used, use the AI's detailed description directly
    if (backgroundImageUrl && backgroundBuffer) {
      // Clean and optimize the AI's description for URL encoding
      // Remove excessive whitespace, newlines, and special characters that might break URL
      let cleanedPrompt = description
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/\n+/g, ' ') // Replace newlines with space
        .replace(/[^\w\s.,!?-]/g, '') // Remove special characters except common punctuation
        .trim();
      
      // Limit prompt length to avoid URL length issues (max ~800 chars for Pollinations.ai)
      const maxPromptLength = 800;
      if (cleanedPrompt.length > maxPromptLength) {
        console.log(`Prompt too long (${cleanedPrompt.length} chars), truncating to ${maxPromptLength} chars`);
        cleanedPrompt = cleanedPrompt.substring(0, maxPromptLength).trim();
        // Try to cut at a word boundary
        const lastSpace = cleanedPrompt.lastIndexOf(' ');
        if (lastSpace > maxPromptLength * 0.8) {
          cleanedPrompt = cleanedPrompt.substring(0, lastSpace).trim();
        }
      }
      
      imagePrompt = cleanedPrompt;
      
      // Add quality and style parameters (keep it short)
      imagePrompt += `, storybook illustration, high quality, seamless integration`;
      
      console.log('Using AI-generated integration prompt for image generation');
      console.log(`Final image generation prompt length: ${imagePrompt.length} characters`);
    }

    // Clean the final prompt one more time before encoding
    imagePrompt = imagePrompt
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .trim();

    // Try OpenAI DALL-E first (more reliable), fallback to Pollinations.ai
    let imageUrlGenerated;
    let imageGenerationMethod = 'dalle';
    
    try {
      console.log('Attempting to generate image with OpenAI DALL-E...');
      
      // Generate image with DALL-E
      const dalleResponse = await retryWithBackoff(async () => {
        return await openai.images.generate({
          model: 'dall-e-3',
          prompt: imagePrompt,
          size: '1024x1024',
          quality: 'standard',
          n: 1
        });
      });
      
      if (dalleResponse.data && dalleResponse.data[0] && dalleResponse.data[0].url) {
        imageUrlGenerated = dalleResponse.data[0].url;
        console.log('✓ Image generated successfully with DALL-E');
        console.log(`Generated image URL: ${imageUrlGenerated}`);
      } else {
        throw new Error('DALL-E did not return image URL');
      }
    } catch (dalleError) {
      console.warn('DALL-E generation failed, falling back to Pollinations.ai:', dalleError.message);
      imageGenerationMethod = 'pollinations';
      
      // Fallback to Pollinations.ai
      const encodedPrompt = encodeURIComponent(imagePrompt);
      console.log(`Encoded prompt length: ${encodedPrompt.length} characters`);
      
      const baseUrl = 'https://image.pollinations.ai/prompt/';
      const params = '?width=1024&height=1024&nologo=true&enhance=true';
      const fullUrl = `${baseUrl}${encodedPrompt}${params}`;
      
      if (fullUrl.length > 8000) {
        console.warn(`Warning: Generated URL is very long (${fullUrl.length} chars), truncating`);
        const maxUrlLength = 8000;
        const maxEncodedLength = maxUrlLength - baseUrl.length - params.length;
        const truncatedEncoded = encodedPrompt.substring(0, maxEncodedLength);
        imageUrlGenerated = `${baseUrl}${truncatedEncoded}${params}`;
        console.log(`URL truncated to ${imageUrlGenerated.length} characters`);
      } else {
        imageUrlGenerated = fullUrl;
      }
      
      console.log(`Generated Pollinations.ai URL: ${imageUrlGenerated.substring(0, 100)}...`);
    }
    
    return {
      success: true,
      generatedImageUrl: imageUrlGenerated,
      backgroundUsed: !!backgroundImageUrl,
      generationMethod: imageGenerationMethod
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
      const isQuotaExceeded = e.status === 429 || (e.message && (
        e.message.includes('quota') || 
        e.message.includes('Quota exceeded') ||
        e.message.includes('429')
      ));
      
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

    console.log('Analyzing images with OpenAI...');

    // Use retry logic for API calls
    const result = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are analyzing two images:
1. A template illustration of a children's birthday book cover showing a baby boy in a forest scene with animals (bear, squirrel, fox, rabbit) and Georgian text "სანის პირველი დაბადების დღე" at the top.
2. A real photo of a child.

Your task:
- Analyze the template image: describe the scene, composition, colors, style, position of the child, background elements, animals, and text placement.
- Analyze the child photo: describe the child's appearance, facial features, hair color, clothing, pose, and expression.
- Create a detailed prompt for generating a new image that places the child from the photo into the template scene, maintaining the same artistic style, composition, and all elements (animals, forest, text) exactly as in the template, but with the new child replacing the original child in the same position and pose.

The output should be a detailed image generation prompt that will recreate the entire scene with the new child seamlessly integrated.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${templateMimeType};base64,${templateBuffer.toString('base64')}`
                }
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${childMimeType};base64,${childBuffer.toString('base64')}`
                }
              }
            ]
          }
        ],
        max_tokens: 2000
      });
    });

    let prompt = result.choices[0].message.content.trim();
    console.log(`Generated prompt: ${prompt.substring(0, 200)}...`);
    console.log(`Generated prompt length: ${prompt.length} characters`);

    // Clean and optimize the prompt for image generation
    prompt = prompt
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n+/g, ' ') // Replace newlines with space
      .trim();
    
    // Limit prompt length for DALL-E (max 1000 chars)
    const maxPromptLength = 1000;
    if (prompt.length > maxPromptLength) {
      console.log(`Prompt too long (${prompt.length} chars), truncating to ${maxPromptLength} chars`);
      prompt = prompt.substring(0, maxPromptLength).trim();
    }

    // Try OpenAI DALL-E first (more reliable), fallback to Pollinations.ai
    let imageUrlGenerated;
    let imageGenerationMethod = 'dalle';
    
    try {
      console.log('Attempting to generate image with OpenAI DALL-E...');
      
      // Generate image with DALL-E
      const dalleResponse = await retryWithBackoff(async () => {
        return await openai.images.generate({
          model: 'dall-e-3',
          prompt: prompt,
          size: '1024x1024',
          quality: 'standard',
          n: 1
        });
      });
      
      if (dalleResponse.data && dalleResponse.data[0] && dalleResponse.data[0].url) {
        imageUrlGenerated = dalleResponse.data[0].url;
        console.log('✓ Image generated successfully with DALL-E');
        console.log(`Generated image URL: ${imageUrlGenerated}`);
      } else {
        throw new Error('DALL-E did not return image URL');
      }
    } catch (dalleError) {
      console.warn('DALL-E generation failed, falling back to Pollinations.ai:', dalleError.message);
      imageGenerationMethod = 'pollinations';
      
      // Fallback to Pollinations.ai
      const cleanedPrompt = prompt
        .replace(/[^\w\s.,!?-]/g, '') // Remove special characters for URL
        .trim();
      
      const encodedPrompt = encodeURIComponent(cleanedPrompt);
      console.log(`Encoded prompt length: ${encodedPrompt.length} characters`);
      
      const baseUrl = 'https://image.pollinations.ai/prompt/';
      const params = '?width=1024&height=1024&nologo=true&enhance=true';
      const fullUrl = `${baseUrl}${encodedPrompt}${params}`;
      
      if (fullUrl.length > 8000) {
        console.warn(`Warning: Generated URL is very long (${fullUrl.length} chars), truncating`);
        const maxEncodedLength = 8000 - baseUrl.length - params.length;
        const truncatedEncoded = encodedPrompt.substring(0, maxEncodedLength);
        imageUrlGenerated = `${baseUrl}${truncatedEncoded}${params}`;
        console.log(`URL truncated to ${imageUrlGenerated.length} characters`);
      } else {
        imageUrlGenerated = fullUrl;
      }
      
      console.log(`Generated Pollinations.ai URL: ${imageUrlGenerated.substring(0, 200)}...`);
    }

    return {
      success: true,
      generatedImageUrl: imageUrlGenerated,
      prompt: prompt,
      generationMethod: imageGenerationMethod
    };
  } catch (error) {
    console.error('Error in replaceChildInTemplate:', error);
    throw error;
  }
}

// Analyze images from Supabase Storage with OpenAI
async function analyzeSupabaseImages(folder = null, options = {}) {
  try {
    console.log(`\n=== Starting analyzeSupabaseImages ===`);
    console.log(`Folder: ${folder || 'all folders'}`);
    
    // Get images from Supabase
    let imagesResult;
    if (folder) {
      imagesResult = await listImagesFromSupabase(folder, options.limit || 100);
    } else {
      imagesResult = await listAllImagesFromSupabase(options.limit || 100);
    }
    
    if (!imagesResult.success || !imagesResult.images || imagesResult.images.length === 0) {
      return {
        success: false,
        error: 'No images found in Supabase Storage',
        images: []
      };
    }
    
    console.log(`Found ${imagesResult.images.length} images in Supabase`);
    
    // Analyze each image with OpenAI
    const analyzedImages = [];
    const modelName = options.model || 'gpt-4o-mini';
    
    for (let i = 0; i < imagesResult.images.length; i++) {
      const image = imagesResult.images[i];
      try {
        console.log(`\nAnalyzing image ${i + 1}/${imagesResult.images.length}: ${image.name}`);
        
        // Fetch image from Supabase URL
        const imageRes = await fetch(image.url);
        if (!imageRes.ok) {
          throw new Error(`Failed to fetch image: ${imageRes.status} ${imageRes.statusText}`);
        }
        
        const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
        const imageMimeType = imageRes.headers.get('content-type') || 'image/jpeg';
        
        // Analyze with OpenAI Vision
        const analysisResult = await retryWithBackoff(async () => {
          return await openai.chat.completions.create({
            model: modelName,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: options.prompt || 'Describe this image in detail. What do you see? Include colors, objects, people, style, and any text if present.'
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:${imageMimeType};base64,${imageBuffer.toString('base64')}`
                    }
                  }
                ]
              }
            ],
            max_tokens: options.maxTokens || 500
          });
        });
        
        const description = analysisResult.choices[0].message.content.trim();
        
        analyzedImages.push({
          name: image.name,
          path: image.path,
          url: image.url,
          folder: image.folder || folder,
          size: image.size,
          created_at: image.created_at,
          analysis: description,
          success: true
        });
        
        console.log(`✓ Successfully analyzed: ${image.name}`);
        
        // Add delay between requests to avoid rate limits
        if (i < imagesResult.images.length - 1 && options.delayBetweenRequests) {
          await sleep(options.delayBetweenRequests);
        }
        
      } catch (error) {
        console.error(`✗ Failed to analyze ${image.name}:`, error.message);
        analyzedImages.push({
          name: image.name,
          path: image.path,
          url: image.url,
          folder: image.folder || folder,
          error: error.message,
          success: false
        });
      }
    }
    
    return {
      success: true,
      totalImages: imagesResult.images.length,
      analyzedCount: analyzedImages.filter(img => img.success).length,
      failedCount: analyzedImages.filter(img => !img.success).length,
      images: analyzedImages
    };
    
  } catch (error) {
    console.error('Error in analyzeSupabaseImages:', error);
    throw error;
  }
}

// Get image from Supabase by path and analyze with OpenAI
async function analyzeSupabaseImageByPath(imagePath, options = {}) {
  try {
    const client = getSupabaseClient();
    
    // Get public URL for the image
    const { data: urlData } = client.storage
      .from('book-uploads')
      .getPublicUrl(imagePath);
    
    if (!urlData || !urlData.publicUrl) {
      throw new Error(`Image not found at path: ${imagePath}`);
    }
    
    console.log(`Analyzing Supabase image: ${imagePath}`);
    console.log(`URL: ${urlData.publicUrl}`);
    
    // Fetch image
    const imageRes = await fetch(urlData.publicUrl);
    if (!imageRes.ok) {
      throw new Error(`Failed to fetch image: ${imageRes.status} ${imageRes.statusText}`);
    }
    
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
    const imageMimeType = imageRes.headers.get('content-type') || 'image/jpeg';
    
    // Analyze with OpenAI
    const modelName = options.model || 'gpt-4o-mini';
    const result = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model: modelName,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: options.prompt || 'Describe this image in detail. What do you see? Include colors, objects, people, style, and any text if present.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${imageMimeType};base64,${imageBuffer.toString('base64')}`
                }
              }
            ]
          }
        ],
        max_tokens: options.maxTokens || 500
      });
    });
    
    const description = result.choices[0].message.content.trim();
    
    return {
      success: true,
      path: imagePath,
      url: urlData.publicUrl,
      analysis: description,
      model: modelName
    };
    
  } catch (error) {
    console.error('Error in analyzeSupabaseImageByPath:', error);
    throw error;
  }
}

module.exports = { 
  generateFairyTaleCharacters, 
  replaceChildInTemplate,
  getOpenAIModel,
  generateText,
  chat,
  findWorkingModel,
  listModels,
  analyzeSupabaseImages,
  analyzeSupabaseImageByPath
};

