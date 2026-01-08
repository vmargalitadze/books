<<<<<<< HEAD
// ===== DOM =====
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const previewSection = document.getElementById('previewSection');
const previewGrid = document.getElementById('previewGrid');
const generateBtn = document.getElementById('generateCharactersBtn');
const charactersSection = document.getElementById('charactersSection');
const charactersGrid = document.getElementById('charactersGrid');

// Child replacement DOM elements (removed - functionality no longer needed)

let uploadedFiles = [];
let uploadedImageUrls = [];
let templateImageUrl = null;
let backgroundImageUrl = null; // Background image from image_id parameter

const API_BASE_URL = 'http://localhost:3000/api';

// Get image_id from URL
const urlParams = new URLSearchParams(window.location.search);
const templateImageId = urlParams.get('image_id');

// Load template image automatically if image_id is provided
if (templateImageId) {
  loadTemplateImage(templateImageId);
}

async function loadTemplateImage(imageId) {
  try {
    console.log('Loading template image with ID:', imageId);
    console.log('API URL:', `${API_BASE_URL}/images/${imageId}`);
    
    const response = await fetch(`${API_BASE_URL}/images/${imageId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }
    
    const data = await response.json();
    console.log('API Response:', data);
    
    if (data.success && data.image && data.image.image_url) {
      templateImageUrl = data.image.image_url;
      // Use this image as background for OpenAI
      backgroundImageUrl = data.image.image_url;
      
      console.log('Template image loaded:', templateImageUrl);
      console.log('Background image set for OpenAI:', backgroundImageUrl);
      
      // Show background preview in UI
      showBackgroundPreview(data.image);
      
      // Show notification that background will be used
      showBackgroundNotification(data.image.name || 'სურათი');
    } else {
      throw new Error(data.error || 'სურათი ვერ მოიძებნა');
    }
  } catch (error) {
    console.error('Error loading template image:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      imageId: imageId,
      apiUrl: `${API_BASE_URL}/images/${imageId}`
    });
    
    // Show user-friendly error message
    const errorMsg = error.message.includes('Failed to fetch') 
      ? 'სერვერთან დაკავშირება ვერ მოხერხდა. გთხოვთ შეამოწმოთ რომ სერვერი მუშაობს.'
      : 'შეცდომა ტემპლეიტის სურათის ჩატვირთვისას: ' + error.message;
    
    alert(errorMsg);
    
    // Hide the background preview section if it was shown
    const previewSection = document.getElementById('selectedBackgroundPreview');
    if (previewSection) {
      previewSection.style.display = 'none';
    }
  }
}

function showBackgroundPreview(image) {
  const previewSection = document.getElementById('selectedBackgroundPreview');
  const previewImg = document.getElementById('selectedBackgroundImg');
  const previewName = document.getElementById('selectedBackgroundName');
  
  if (previewSection && previewImg && previewName) {
    const imageUrl = image.image_url || '';
    
    if (!imageUrl) {
      console.error('Image URL is empty');
      return;
    }
    
    // Set image source
    previewImg.src = imageUrl;
    previewImg.alt = image.name || 'ბექგრაუნდი';
    previewName.textContent = image.name || 'სურათი';
    
    // Handle image load errors
    previewImg.onerror = function() {
      console.error('Failed to load background image:', imageUrl);
      previewImg.src = '';
      previewImg.alt = 'სურათი ვერ ჩაიტვირთა';
      previewName.textContent = 'სურათი ვერ ჩაიტვირთა';
      previewName.style.color = 'red';
    };
    
    // Handle successful image load
    previewImg.onload = function() {
      console.log('Background image loaded successfully:', imageUrl);
      previewName.style.color = '#333';
    };
    
    previewSection.style.display = 'block';
  } else {
    console.error('Background preview elements not found');
  }
}

function showBackgroundNotification(imageName) {
  // Create notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #9b59b6;
    color: white;
    padding: 15px 20px;
    border-radius: 5px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    z-index: 1000;
    max-width: 300px;
    font-size: 14px;
  `;
  notification.innerHTML = `
    <strong>✓ ბექგრაუნდი ავტომატურად აირჩია</strong><br>
    <small>${imageName} გამოყენებული იქნება ბექგრაუნდად</small>
  `;
  document.body.appendChild(notification);
  
  // Remove after 5 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s';
    setTimeout(() => notification.remove(), 500);
  }, 5000);
}

// ===== Upload handling =====
fileInput.addEventListener('change', e => handleFiles([...e.target.files]));

function handleFiles(files) {
  files.forEach(file => {
    if (!file.type.startsWith('image/')) return;
    uploadedFiles.push(file);

    const reader = new FileReader();
    reader.onload = e => {
      const div = document.createElement('div');
      div.className = 'preview-item';
      div.innerHTML = `<img src="${e.target.result}">`;
      previewGrid.appendChild(div);
    };
    reader.readAsDataURL(file);
  });

  if (uploadedFiles.length) {
    previewSection.style.display = 'block';
    generateBtn.style.display = 'inline-block';
  }
}

// ===== Generate Fairy Tale Characters =====
generateBtn.addEventListener('click', async () => {
  if (!uploadedFiles.length) {
    alert('გთხოვთ აირჩიოთ სურათები');
    return;
  }

  generateBtn.disabled = true;
  generateBtn.textContent = 'მუშავდება...';

  // Hide real photos immediately
  previewSection.style.display = 'none';

  charactersSection.style.display = 'block';
  charactersGrid.innerHTML = `<p>სურათების ატვირთვა მიმდინარეობს...</p>`;

  try {
    console.log(`Starting upload of ${uploadedFiles.length} file(s)...`);
    
    // Upload images
    const formData = new FormData();
    uploadedFiles.forEach((f, index) => {
      console.log(`Adding file ${index + 1}: ${f.name} (${f.size} bytes, ${f.type})`);
      formData.append('images', f);
    });

    console.log('Sending upload request to:', `${API_BASE_URL}/upload/multiple`);
    
    const uploadRes = await fetch(`${API_BASE_URL}/upload/multiple`, {
      method: 'POST',
      body: formData
    });

    console.log('Upload response status:', uploadRes.status, uploadRes.statusText);

    if (!uploadRes.ok) {
      let errorMessage = `HTTP ${uploadRes.status}: ${uploadRes.statusText}`;
      try {
        const errorData = await uploadRes.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        const errorText = await uploadRes.text();
        errorMessage = errorText || errorMessage;
      }
      throw new Error(`სურათების ატვირთვა ვერ მოხერხდა: ${errorMessage}`);
    }

    const uploadData = await uploadRes.json();
    console.log('Upload response:', uploadData);

    if (!uploadData.success) {
      throw new Error(uploadData.error || 'სურათების ატვირთვა ვერ მოხერხდა');
    }

    if (!uploadData.files || uploadData.files.length === 0) {
      throw new Error('სურათები არ იტვირთება. გთხოვთ სცადოთ თავიდან.');
    }

    uploadedImageUrls = uploadData.files.map(f => f.url);
    console.log(`Successfully uploaded ${uploadedImageUrls.length} image(s):`, uploadedImageUrls);

    // Update UI
    charactersGrid.innerHTML = `<p>გმირების შექმნა მიმდინარეობს... (${uploadedImageUrls.length} სურათი)</p>`;

    // Prepare request body with background image if available
    const requestBody = { imageUrls: uploadedImageUrls };
    if (backgroundImageUrl) {
      requestBody.backgroundImageUrl = backgroundImageUrl;
      console.log('Using background image from image_id:', backgroundImageUrl);
    }

    console.log('Sending AI request:', requestBody);

    // Generate characters
    const aiRes = await fetch(`${API_BASE_URL}/ai/fairy-tale-characters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    console.log('AI response status:', aiRes.status, aiRes.statusText);

    if (!aiRes.ok) {
      let errorMessage = `HTTP ${aiRes.status}: ${aiRes.statusText}`;
      try {
        const errorData = await aiRes.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        const errorText = await aiRes.text();
        errorMessage = errorText || errorMessage;
      }
      throw new Error(`გმირების შექმნა ვერ მოხერხდა: ${errorMessage}`);
    }

    const aiData = await aiRes.json();
    console.log('AI response:', aiData);

    if (!aiData.success) {
      throw new Error(aiData.error || 'გმირების შექმნა ვერ მოხერხდა');
    }

    if (!aiData.data || !aiData.data.characters || aiData.data.characters.length === 0) {
      throw new Error('გმირები ვერ შეიქმნა. გთხოვთ სცადოთ თავიდან.');
    }

    charactersGrid.innerHTML = '';

    let successCount = 0;
    aiData.data.characters.forEach((char, i) => {
      if (!char.success || !char.generatedImageUrl) {
        const errorMsg = char.error || 'უცნობი შეცდომა';
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'color: red; padding: 10px; margin: 10px 0; background: #ffe6e6; border-radius: 5px;';
        errorDiv.innerHTML = `<strong>გმირი ${i + 1} ვერ შეიქმნა:</strong> ${errorMsg}`;
        charactersGrid.appendChild(errorDiv);
        console.error(`Character ${i + 1} failed:`, char);
        return;
      }

      successCount++;
      const card = document.createElement('div');
      card.className = 'character-card';

      const img = document.createElement('img');
      img.src = char.generatedImageUrl;
      img.alt = `ზღაპრის გმირი ${i + 1}`;
      img.style.cssText = 'width: 100%; height: auto; border-radius: 5px;';

      img.onerror = async () => {
        console.error(`Failed to load generated image ${i + 1}:`, char.generatedImageUrl);
        
        // Check if it's a Pollinations.ai error
        const isPollinationsError = char.generatedImageUrl && char.generatedImageUrl.includes('pollinations.ai');
        
        let errorMessage = 'სურათი ვერ ჩაიტვირთა';
        let errorDetails = '';
        
        if (isPollinationsError) {
          // Try to fetch the URL to get more details about the error
          try {
            const res = await fetch(char.generatedImageUrl);
            const data = await res.json();
            
            if (data.error) {
              console.error('Pollinations.ai error details:', data.error);
              
              if (data.error.includes('No active flux servers') || data.error.includes('Internal Server Error')) {
                errorMessage = 'სურათის გენერაციის სერვისი დროებით მიუწვდომელია';
                errorDetails = 'გთხოვთ სცადოთ თავიდან რამდენიმე წუთში. სერვისი დროებით არ მუშაობს.';
              } else {
                errorMessage = 'სურათის გენერაცია ვერ მოხერხდა';
                errorDetails = data.error;
              }
            }
          } catch (fetchError) {
            console.error('Error fetching image details:', fetchError);
            errorMessage = 'სურათის გენერაციის სერვისი დროებით მიუწვდომელია';
            errorDetails = 'გთხოვთ სცადოთ თავიდან რამდენიმე წუთში.';
          }
        }
        
        card.innerHTML = `
          <div style="color:red; padding: 20px; text-align: center; background: #ffe6e6; border-radius: 5px;">
            <p style="margin: 0 0 10px 0; font-weight: bold;">${errorMessage}</p>
            ${errorDetails ? `<small style="color: #666; display: block; margin-top: 5px;">${errorDetails}</small>` : ''}
            <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #9b59b6; color: white; border: none; border-radius: 5px; cursor: pointer;">
              სცადეთ თავიდან
            </button>
          </div>
        `;
      };

      img.onload = () => {
        console.log(`Successfully loaded generated image ${i + 1}`);
      };

      card.appendChild(img);
      charactersGrid.appendChild(card);
    });

    if (successCount === 0) {
      charactersGrid.innerHTML = `<p style="color:red; padding: 20px;">ყველა გმირი ვერ შეიქმნა. გთხოვთ სცადოთ თავიდან.</p>`;
    } else {
      console.log(`Successfully generated ${successCount} character(s)`);
    }

  } catch (err) {
    console.error('Error generating characters:', err);
    console.error('Error details:', {
      message: err.message,
      stack: err.stack,
      uploadedFilesCount: uploadedFiles.length,
      uploadedImageUrlsCount: uploadedImageUrls?.length || 0
    });
    
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'color: red; padding: 20px; margin: 20px 0; background: #ffe6e6; border-radius: 5px;';
    errorDiv.innerHTML = `
      <strong>შეცდომა:</strong> ${err.message}
      <br><small>გთხოვთ შეამოწმოთ console-ში დეტალებისთვის (F12)</small>
    `;
    charactersGrid.innerHTML = '';
    charactersGrid.appendChild(errorDiv);
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = 'ზღაპრის გმირების შექმნა';
  }
});

=======
// ===== DOM =====
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const previewSection = document.getElementById('previewSection');
const previewGrid = document.getElementById('previewGrid');
const generateBtn = document.getElementById('generateCharactersBtn');
const charactersSection = document.getElementById('charactersSection');
const charactersGrid = document.getElementById('charactersGrid');

// Child replacement DOM elements (removed - functionality no longer needed)

let uploadedFiles = [];
let uploadedImageUrls = [];
let templateImageUrl = null;
let backgroundImageUrl = null; // Background image from image_id parameter

const API_BASE_URL = 'http://localhost:3000/api';

// Get image_id from URL
const urlParams = new URLSearchParams(window.location.search);
const templateImageId = urlParams.get('image_id');

// Load template image automatically if image_id is provided
if (templateImageId) {
  loadTemplateImage(templateImageId);
}

async function loadTemplateImage(imageId) {
  try {
    const response = await fetch(`${API_BASE_URL}/images/${imageId}`);
    const data = await response.json();
    
    if (data.success && data.image && data.image.image_url) {
      templateImageUrl = data.image.image_url;
      // Use this image as background for Google AI
      backgroundImageUrl = data.image.image_url;
      
      console.log('Template image loaded:', templateImageUrl);
      console.log('Background image set for Google AI:', backgroundImageUrl);
      
      // Show background preview in UI
      showBackgroundPreview(data.image);
      
      // Show notification that background will be used
      showBackgroundNotification(data.image.name || 'სურათი');
    } else {
      throw new Error('სურათი ვერ მოიძებნა');
    }
  } catch (error) {
    console.error('Error loading template image:', error);
    alert('შეცდომა ტემპლეიტის სურათის ჩატვირთვისას: ' + error.message);
  }
}

function showBackgroundPreview(image) {
  const previewSection = document.getElementById('selectedBackgroundPreview');
  const previewImg = document.getElementById('selectedBackgroundImg');
  const previewName = document.getElementById('selectedBackgroundName');
  
  if (previewSection && previewImg && previewName) {
    previewImg.src = image.image_url || '';
    previewImg.alt = image.name || 'ბექგრაუნდი';
    previewName.textContent = image.name || 'სურათი';
    previewSection.style.display = 'block';
  }
}

function showBackgroundNotification(imageName) {
  // Create notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #9b59b6;
    color: white;
    padding: 15px 20px;
    border-radius: 5px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    z-index: 1000;
    max-width: 300px;
    font-size: 14px;
  `;
  notification.innerHTML = `
    <strong>✓ ბექგრაუნდი ავტომატურად აირჩია</strong><br>
    <small>${imageName} გამოყენებული იქნება ბექგრაუნდად</small>
  `;
  document.body.appendChild(notification);
  
  // Remove after 5 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s';
    setTimeout(() => notification.remove(), 500);
  }, 5000);
}

// ===== Upload handling =====
fileInput.addEventListener('change', e => handleFiles([...e.target.files]));

function handleFiles(files) {
  files.forEach(file => {
    if (!file.type.startsWith('image/')) return;
    uploadedFiles.push(file);

    const reader = new FileReader();
    reader.onload = e => {
      const div = document.createElement('div');
      div.className = 'preview-item';
      div.innerHTML = `<img src="${e.target.result}">`;
      previewGrid.appendChild(div);
    };
    reader.readAsDataURL(file);
  });

  if (uploadedFiles.length) {
    previewSection.style.display = 'block';
    generateBtn.style.display = 'inline-block';
  }
}

// ===== Generate Fairy Tale Characters =====
generateBtn.addEventListener('click', async () => {
  if (!uploadedFiles.length) return;

  generateBtn.disabled = true;
  generateBtn.textContent = 'მუშავდება...';

  // Hide real photos immediately
  previewSection.style.display = 'none';

  charactersSection.style.display = 'block';
  charactersGrid.innerHTML = `<p>გმირების შექმნა მიმდინარეობს...</p>`;

  try {
    // Upload images
    const formData = new FormData();
    uploadedFiles.forEach(f => formData.append('images', f));

    const uploadRes = await fetch('http://localhost:3000/api/upload/multiple', {
      method: 'POST',
      body: formData
    });

    const uploadData = await uploadRes.json();
    uploadedImageUrls = uploadData.files.map(f => f.url);

    // Prepare request body with background image if available
    const requestBody = { imageUrls: uploadedImageUrls };
    if (backgroundImageUrl) {
      requestBody.backgroundImageUrl = backgroundImageUrl;
      console.log('Using background image from image_id:', backgroundImageUrl);
    }

    // Generate characters
    const aiRes = await fetch('http://localhost:3000/api/ai/fairy-tale-characters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!aiRes.ok) {
      const errorData = await aiRes.json();
      throw new Error(errorData.error || `Server error: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();

    if (!aiData.success) {
      throw new Error(aiData.error || 'Failed to generate characters');
    }

    charactersGrid.innerHTML = '';

    aiData.data.characters.forEach((char, i) => {
      if (!char.success || !char.generatedImageUrl) {
        const errorMsg = char.error || 'უცნობი შეცდომა';
        const errorCard = document.createElement('div');
        errorCard.className = 'character-card';
        errorCard.innerHTML = `<p style="color:red; padding: 20px; text-align: center;">გმირი ${i + 1} ვერ შეიქმნა: ${errorMsg}</p>`;
        charactersGrid.appendChild(errorCard);
        console.error(`Character ${i + 1} failed:`, char);
        return;
      }

      const card = document.createElement('div');
      card.className = 'character-card';

      // Add loading placeholder
      const loadingDiv = document.createElement('div');
      loadingDiv.style.cssText = 'padding: 20px; text-align: center; color: #666; min-height: 300px; display: flex; align-items: center; justify-content: center;';
      loadingDiv.textContent = 'სურათი იტვირთება...';
      card.appendChild(loadingDiv);

      // Log the URL for debugging
      console.log(`Character ${i + 1} image URL:`, char.generatedImageUrl);

      const img = document.createElement('img');
      img.style.cssText = 'width: 100%; height: auto; min-height: 300px; object-fit: cover; display: none;';
      img.crossOrigin = 'anonymous'; // Allow CORS
      img.alt = `ზღაპრის გმირი ${i + 1}`;
      img.loading = 'lazy';

      // Handle pollinations.ai URLs - they might need special handling
      let imageUrl = char.generatedImageUrl;
      
      // If it's a pollinations.ai URL, try to ensure it's properly formatted
      if (imageUrl.includes('pollinations.ai')) {
        // Pollinations URLs should work directly, but add timestamp to avoid cache issues
        const separator = imageUrl.includes('?') ? '&' : '?';
        imageUrl += separator + 't=' + Date.now();
        
        // Pollinations.ai might need a moment to generate, so we'll retry
        console.log(`Using pollinations.ai URL for character ${i + 1}`);
      }

      // Retry logic for pollinations.ai URLs (they might need time to generate)
      let retryCount = 0;
      const maxRetries = 3;
      const retryDelay = 3000; // 3 seconds

      const tryLoadImage = (url) => {
        img.src = url;
      };

      img.onload = () => {
        loadingDiv.remove(); // Remove loading text
        img.style.display = 'block'; // Show image
        console.log(`Character ${i + 1} image loaded successfully`);
      };

      img.onerror = (e) => {
        retryCount++;
        console.error(`Failed to load image for character ${i + 1} (attempt ${retryCount}):`, {
          url: imageUrl,
          error: e
        });
        
        // Retry for pollinations.ai URLs (they might need time to generate)
        if (imageUrl.includes('pollinations.ai') && retryCount < maxRetries) {
          loadingDiv.textContent = `სურათი იტვირთება... (ცდა ${retryCount + 1}/${maxRetries})`;
          // Add fresh timestamp to force new request
          const baseUrl = imageUrl.split('&t=')[0].split('?t=')[0];
          const separator = baseUrl.includes('?') ? '&' : '?';
          const newUrl = baseUrl + separator + 't=' + Date.now();
          setTimeout(() => {
            imageUrl = newUrl;
            tryLoadImage(newUrl);
          }, retryDelay * retryCount);
        } else {
          // Show error after all retries failed
          loadingDiv.innerHTML = `
            <div style="padding: 20px; text-align: center;">
              <p style="color:red; margin: 0 0 10px 0;">სურათი ვერ ჩაიტვირთა</p>
              <a href="${char.generatedImageUrl}" target="_blank" style="color: #9b59b6; text-decoration: underline; font-size: 12px; display: inline-block; margin-top: 10px;">
                სცადეთ პირდაპირ გახსნა
              </a>
              <br><br>
              <small style="color: #999; font-size: 10px; word-break: break-all; display: block;">
                ${char.generatedImageUrl ? char.generatedImageUrl.substring(0, 80) + '...' : 'N/A'}
              </small>
            </div>
          `;
        }
      };

      // Start loading the image
      tryLoadImage(imageUrl);

      card.appendChild(img);
      charactersGrid.appendChild(card);
    });


  } catch (err) {
    console.error('Error generating characters:', err);
    charactersGrid.innerHTML = `<p style="color:red">შეცდომა: ${err.message}</p>`;
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = 'ზღაპრის გმირების შექმნა';
  }
});

>>>>>>> 38f815a0fdc04e3d7845f3e822a01a82cd35a6e1
