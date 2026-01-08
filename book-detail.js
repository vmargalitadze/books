const API_BASE_URL = 'http://localhost:3000/api';

let currentBook = null;
let uploadedUserFiles = [];
let uploadedUserImageUrls = [];

// Get book ID from URL
const urlParams = new URLSearchParams(window.location.search);
const bookId = urlParams.get('id');

// Load book when page loads
document.addEventListener('DOMContentLoaded', function() {
    if (bookId) {
        loadBook(bookId);
    } else {
        document.getElementById('bookInfo').innerHTML = `
            <div class="error">
                <h2>შეცდომა</h2>
                <p>წიგნის ID არ არის მითითებული</p>
                <a href="./images.html" style="color: var(--coral-dark); text-decoration: underline;">უკან წიგნებზე</a>
            </div>
        `;
    }
    
    // Setup file input
    const fileInput = document.getElementById('userFileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
    
    // Setup generate button
    const generateBtn = document.getElementById('generatePersonalizedBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generatePersonalizedPages);
    }
});

// Load book details
async function loadBook(bookId) {
    const bookInfo = document.getElementById('bookInfo');
    bookInfo.innerHTML = '<div class="loading">იტვირთება...</div>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/books/${bookId}`);
        const data = await response.json();
        
        if (data.success && data.book) {
            currentBook = data.book;
            displayBookInfo(data.book);
            document.getElementById('uploadSection').style.display = 'block';
        } else {
            bookInfo.innerHTML = `
                <div class="error">
                    <h2>შეცდომა</h2>
                    <p>წიგნი ვერ მოიძებნა</p>
                    <a href="./images.html" style="color: var(--coral-dark); text-decoration: underline;">უკან წიგნებზე</a>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading book:', error);
        bookInfo.innerHTML = `
            <div class="error">
                <h2>შეცდომა</h2>
                <p>წიგნის ჩატვირთვა ვერ მოხერხდა</p>
                <a href="./images.html" style="color: var(--coral-dark); text-decoration: underline;">უკან წიგნებზე</a>
            </div>
        `;
    }
}

// Display book information
function displayBookInfo(book) {
    const bookInfo = document.getElementById('bookInfo');
    const coverImageUrl = book.cover_image_url || (book.images && book.images.length > 0 ? book.images[0] : '');
    const imageCount = book.images ? book.images.length : 0;
    
    bookInfo.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 40px; align-items: start;">
            <div>
                ${coverImageUrl ? `
                    <img src="${coverImageUrl}" 
                         alt="${escapeHtml(book.title || '')}" 
                         style="width: 100%; border-radius: 15px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);"
                         onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22400%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22300%22 height=%22400%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22%3Eსურათი არ მოიძებნა%3C/text%3E%3C/svg%3E'">
                ` : `
                    <div style="width: 100%; aspect-ratio: 2/3; background: linear-gradient(135deg, #B1D8D2 0%, #f1e5df 100%); border-radius: 15px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);">
                        <span style="font-size: 72px;">📚</span>
                    </div>
                `}
            </div>
            <div>
                <h1 style="color: #1a2b4a; font-size: 42px; margin-bottom: 20px; text-transform: uppercase;">${escapeHtml(book.title || 'უსახელო წიგნი')}</h1>
                ${book.description ? `<p style="color: #666; font-size: 18px; line-height: 1.6; margin-bottom: 20px;">${escapeHtml(book.description)}</p>` : ''}
                ${book.price ? `<div style="font-size: 32px; font-weight: bold; color: #27ae60; margin-bottom: 20px;">${parseFloat(book.price).toFixed(2)} ₾</div>` : ''}
                ${book.author ? `<p style="color: #666; margin-bottom: 20px;"><strong>ავტორი:</strong> ${escapeHtml(book.author)}</p>` : ''}
                <p style="color: #666; margin-bottom: 30px;"><strong>ფურცლების რაოდენობა:</strong> ${imageCount}</p>
                <a href="./images.html" style="display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, var(--coral) 0%, var(--coral-dark) 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; transition: all 0.3s; box-shadow: 0 2px 5px rgba(253, 89, 50, 0.3);" 
                   onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 10px rgba(253, 89, 50, 0.4)';" 
                   onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 5px rgba(253, 89, 50, 0.3)';">
                    ← უკან წიგნებზე
                </a>
            </div>
        </div>
    `;
}

// Handle file selection
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;
    
    // Validate file types and sizes
    const validFiles = files.filter(file => {
        const isValidType = file.type.startsWith('image/');
        const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
        return isValidType && isValidSize;
    });
    
    if (validFiles.length !== files.length) {
        alert('ზოგიერთი ფაილი არ არის მხარდაჭერილი ან ძალიან დიდია (მაქს. 10MB)');
    }
    
    uploadedUserFiles = [...uploadedUserFiles, ...validFiles];
    displayUploadedPreview();
}

// Display uploaded files preview
function displayUploadedPreview() {
    const previewContainer = document.getElementById('uploadedPreview');
    const previewGrid = document.getElementById('uploadedPreviewGrid');
    
    if (uploadedUserFiles.length === 0) {
        previewContainer.style.display = 'none';
        document.getElementById('generatePersonalizedBtn').style.display = 'none';
        return;
    }
    
    previewContainer.style.display = 'block';
    document.getElementById('generatePersonalizedBtn').style.display = 'inline-block';
    
    previewGrid.innerHTML = uploadedUserFiles.map((file, index) => {
        return `
            <div style="position: relative;">
                <img src="${URL.createObjectURL(file)}" 
                     alt="${escapeHtml(file.name)}" 
                     style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; border: 2px solid #ddd;">
                <button onclick="removeUploadedFile(${index})" 
                        style="position: absolute; top: 5px; right: 5px; background: #dc3545; color: white; border: none; border-radius: 50%; width: 25px; height: 25px; cursor: pointer; font-size: 14px;">
                    ×
                </button>
            </div>
        `;
    }).join('');
}

// Remove uploaded file
function removeUploadedFile(index) {
    uploadedUserFiles.splice(index, 1);
    displayUploadedPreview();
}

// Generate personalized pages
async function generatePersonalizedPages() {
    if (!currentBook || !currentBook.images || currentBook.images.length === 0) {
        alert('წიგნს არ აქვს ფურცლები');
        return;
    }
    
    if (uploadedUserFiles.length === 0) {
        alert('გთხოვთ აირჩიოთ სურათები');
        return;
    }
    
    const generateBtn = document.getElementById('generatePersonalizedBtn');
    const originalText = generateBtn.textContent;
    generateBtn.disabled = true;
    generateBtn.textContent = 'მუშავდება...';
    
    const generatedContainer = document.getElementById('generatedImagesContainer');
    const generatedGrid = document.getElementById('generatedImagesGrid');
    
    generatedContainer.style.display = 'block';
    generatedGrid.innerHTML = '<div class="loading" style="grid-column: 1 / -1;">სურათების ატვირთვა და AI-ით დამუშავება მიმდინარეობს...</div>';
    
    try {
        // Step 1: Upload user images
        const formData = new FormData();
        uploadedUserFiles.forEach(file => {
            formData.append('images', file);
        });
        
        const uploadRes = await fetch(`${API_BASE_URL}/upload/multiple`, {
            method: 'POST',
            body: formData
        });
        
        if (!uploadRes.ok) {
            throw new Error('სურათების ატვირთვა ვერ მოხერხდა');
        }
        
        const uploadData = await uploadRes.json();
        if (!uploadData.success || !uploadData.files || uploadData.files.length === 0) {
            throw new Error('სურათების ატვირთვა ვერ მოხერხდა');
        }
        
        uploadedUserImageUrls = uploadData.files.map(f => f.url);
        console.log('Uploaded user images:', uploadedUserImageUrls);
        
        // Step 2: For each book page, replace with user images using AI
        const bookPages = currentBook.images || [];
        const generatedImages = [];
        
        // Use first uploaded image for all pages (or cycle through if multiple)
        const userImageUrl = uploadedUserImageUrls[0];
        
        generatedGrid.innerHTML = '<div class="loading" style="grid-column: 1 / -1;">AI-ით ფურცლების შექმნა მიმდინარეობს... (0/' + bookPages.length + ')</div>';
        
        for (let i = 0; i < bookPages.length; i++) {
            const pageUrl = bookPages[i];
            
            try {
                // Update progress
                generatedGrid.innerHTML = `<div class="loading" style="grid-column: 1 / -1;">AI-ით ფურცლების შექმნა მიმდინარეობს... (${i + 1}/${bookPages.length})</div>`;
                
                // Call AI to replace child in template
                const aiRes = await fetch(`${API_BASE_URL}/ai/replace-child`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        childImageUrl: userImageUrl,
                        templateImageUrl: pageUrl
                    })
                });
                
                if (!aiRes.ok) {
                    throw new Error(`AI-ის შეცდომა ფურცლის ${i + 1} შექმნისას`);
                }
                
                const aiData = await aiRes.json();
                if (aiData.success && aiData.data && aiData.data.generatedImageUrl) {
                    generatedImages.push({
                        originalPage: pageUrl,
                        personalizedPage: aiData.data.generatedImageUrl,
                        pageNumber: i + 1
                    });
                } else {
                    throw new Error(`ფურცელი ${i + 1} ვერ შეიქმნა`);
                }
                
                // Add delay between requests to avoid rate limits
                if (i < bookPages.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            } catch (error) {
                console.error(`Error generating page ${i + 1}:`, error);
                // Continue with next page even if one fails
            }
        }
        
        // Display generated images
        if (generatedImages.length > 0) {
            displayGeneratedImages(generatedImages);
        } else {
            generatedGrid.innerHTML = '<div class="error" style="grid-column: 1 / -1;">ფურცლების შექმნა ვერ მოხერხდა</div>';
        }
        
    } catch (error) {
        console.error('Error generating personalized pages:', error);
        generatedGrid.innerHTML = `<div class="error" style="grid-column: 1 / -1;">შეცდომა: ${error.message}</div>`;
    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = originalText;
    }
}

// Display generated personalized images
function displayGeneratedImages(generatedImages) {
    const generatedGrid = document.getElementById('generatedImagesGrid');
    
    generatedGrid.innerHTML = generatedImages.map((item, index) => `
        <div class="gallery-card" style="position: relative;">
            <div style="position: relative;">
                <img src="${item.personalizedPage}" 
                     alt="პერსონალიზებული ფურცელი ${item.pageNumber}" 
                     class="gallery-card-image"
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22300%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22300%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22%3Eსურათი არ მოიძებნა%3C/text%3E%3C/svg%3E'">
                <div style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 5px 10px; border-radius: 5px; font-size: 12px;">
                    ფურცელი ${item.pageNumber}
                </div>
            </div>
            <div class="gallery-card-content">
                <h3 class="gallery-card-title">პერსონალიზებული ფურცელი ${item.pageNumber}</h3>
                <div class="gallery-card-footer">
                    <a href="${item.personalizedPage}" download="personalized-page-${item.pageNumber}.jpg" 
                       style="color: #27ae60; font-weight: bold; text-decoration: none;">ჩამოტვირთვა ↓</a>
                </div>
            </div>
        </div>
    `).join('');
}

// Make functions globally available
window.removeUploadedFile = removeUploadedFile;

// Utility functions
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

