const API_BASE_URL = 'http://localhost:3000/api';

let allImages = []; // Store all images to match with book image URLs
let currentBook = null; // Store current selected book
let uploadedUserFiles = []; // Store uploaded user images
let uploadedUserImageUrls = []; // Store uploaded user image URLs

// Load books when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadBooks();
    loadAllImages(); // Load all images to match with book image URLs
});

// Load all images for matching with book URLs
async function loadAllImages() {
    try {
        const response = await fetch(`${API_BASE_URL}/images`);
        const data = await response.json();
        if (data.success && data.images) {
            allImages = data.images;
        }
    } catch (error) {
        console.error('Error loading all images:', error);
    }
}

// Load books
async function loadBooks() {
    const container = document.getElementById('booksContainer');
    container.innerHTML = '<div class="loading">იტვირთება...</div>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/books`);
        const data = await response.json();
        
        if (data.success && data.books && data.books.length > 0) {
            displayBooks(data.books);
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <h2>წიგნები ჯერ არ არის დამატებული</h2>
                    <p>გთხოვთ, მოგვიანებით სცადოთ</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading books:', error);
        container.innerHTML = `
            <div class="error">
                <h2>შეცდომა</h2>
                <p>წიგნების ჩატვირთვა ვერ მოხერხდა. გთხოვთ, სცადოთ მოგვიანებით.</p>
            </div>
        `;
    }
}

// Display books
function displayBooks(books) {
    const container = document.getElementById('booksContainer');
    
    if (books.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h2>წიგნები ჯერ არ არის დამატებული</h2>
                <p>გთხოვთ, მოგვიანებით სცადოთ</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = books.map(book => {
        // Get first image URL for preview
        const firstImageUrl = book.images && book.images.length > 0 ? book.images[0] : '';
        const imageCount = book.images ? book.images.length : 0;
        
        return `
        <div class="gallery-card book-card" onclick="window.location.href='./book-detail.html?id=${book.id}'" style="cursor: pointer;">
            ${firstImageUrl ? `
                <img src="${firstImageUrl}" 
                     alt="${escapeHtml(book.title || '')}" 
                     class="gallery-card-image"
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22300%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22300%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22%3Eსურათი არ მოიძებნა%3C/text%3E%3C/svg%3E'">
            ` : `
                <div class="gallery-card-image" style="background: linear-gradient(135deg, #B1D8D2 0%, #f1e5df 100%); display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 48px;">📚</span>
                </div>
            `}
            <div class="gallery-card-content">
                <h3 class="gallery-card-title">${escapeHtml(book.title || 'უსახელო წიგნი')}</h3>
                ${book.description ? `<p class="gallery-card-description">${escapeHtml(book.description)}</p>` : ''}
                ${book.price ? `<div class="gallery-card-price">${parseFloat(book.price).toFixed(2)} ₾</div>` : ''}
                <div class="gallery-card-footer">
                    <span class="gallery-card-date">${imageCount} ფურცელი</span>
                    <span style="color: #27ae60; font-weight: bold;">ფურცლების ნახვა →</span>
                </div>
            </div>
        </div>
    `;
    }).join('');
}

// Show images for selected book
async function showBookImages(bookId) {
    try {
        const response = await fetch(`${API_BASE_URL}/books/${bookId}`);
        const data = await response.json();
        
        if (data.success && data.book) {
            const book = data.book;
            currentBook = book; // Store current book
            const imageUrls = book.images || [];
            
            // Hide books container, show back button, images container and upload section
            document.getElementById('booksContainer').style.display = 'none';
            document.getElementById('backButtonContainer').style.display = 'block';
            document.getElementById('bookImagesContainer').style.display = 'grid';
            document.getElementById('uploadSection').style.display = 'block';
            
            // Reset upload state
            uploadedUserFiles = [];
            uploadedUserImageUrls = [];
            document.getElementById('uploadedPreview').style.display = 'none';
            document.getElementById('generatePersonalizedBtn').style.display = 'none';
            document.getElementById('generatedImagesContainer').style.display = 'none';
            
            // Display images
            displayBookImages(imageUrls, book.title);
        } else {
            alert('წიგნის ჩატვირთვა ვერ მოხერხდა');
        }
    } catch (error) {
        console.error('Error loading book:', error);
        alert('შეცდომა წიგნის ჩატვირთვისას');
    }
}

// Display images for a book
function displayBookImages(imageUrls, bookTitle) {
    const container = document.getElementById('bookImagesContainer');
    
    if (imageUrls.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <h2>ამ წიგნს არ აქვს ფურცლები</h2>
            </div>
        `;
        return;
    }
    
    // Match image URLs with image objects to get IDs
    const images = imageUrls.map(url => {
        const image = allImages.find(img => img.image_url === url);
        return image ? { ...image, image_url: url } : { image_url: url, name: 'უსახელო', id: null };
    });
    
    container.innerHTML = images.map(image => {
        const detailLink = image.id ? `./image-detail.html?id=${image.id}` : '#';
        return `
        <a href="${detailLink}" class="gallery-card">
            <img src="${image.image_url || ''}" 
                 alt="${escapeHtml(image.name || '')}" 
                 class="gallery-card-image"
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22300%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22300%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22%3Eსურათი არ მოიძებნა%3C/text%3E%3C/svg%3E'">
            <div class="gallery-card-content">
                <h3 class="gallery-card-title">${escapeHtml(image.name || 'უსახელო')}</h3>
                <div class="gallery-card-footer">
                    <span style="color: #27ae60; font-weight: bold;">დეტალები →</span>
                </div>
            </div>
        </a>
    `;
    }).join('');
}

// Back to books list
function backToBooks() {
    document.getElementById('booksContainer').style.display = 'grid';
    document.getElementById('backButtonContainer').style.display = 'none';
    document.getElementById('bookImagesContainer').style.display = 'none';
    document.getElementById('uploadSection').style.display = 'none';
    currentBook = null;
    uploadedUserFiles = [];
    uploadedUserImageUrls = [];
}

// Handle file input change
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('userFileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
    
    const generateBtn = document.getElementById('generatePersonalizedBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generatePersonalizedPages);
    }
});

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
        const reader = new FileReader();
        let imageUrl = '';
        
        reader.onload = function(e) {
            imageUrl = e.target.result;
        };
        reader.readAsDataURL(file);
        
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

// Make functions globally available
window.showBookImages = showBookImages;
window.backToBooks = backToBooks;

// Back button event listener
document.addEventListener('DOMContentLoaded', function() {
    const backBtn = document.getElementById('backToBooksBtn');
    if (backBtn) {
        backBtn.addEventListener('click', backToBooks);
    }
});

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    
    // Georgian month names
    const months = [
        'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 
        'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 
        'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'
    ];
    
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${day} ${month}, ${year}`;
}

