const API_BASE_URL = 'http://localhost:3000/api';

let currentImage = null;

// Get image ID from URL
const urlParams = new URLSearchParams(window.location.search);
const imageId = urlParams.get('id');

// Load image details when page loads
document.addEventListener('DOMContentLoaded', function() {
    if (imageId) {
        loadImageDetail(imageId);
    } else {
        showError('სურათის ID არ მოიძებნა');
    }
});

async function loadImageDetail(id) {
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const imageDetail = document.getElementById('imageDetail');
    
    try {
        const response = await fetch(`${API_BASE_URL}/images/${id}`);
        const data = await response.json();
        
        if (data.success && data.image) {
            currentImage = data.image;
            displayImageDetail(data.image);
            loadingState.style.display = 'none';
            imageDetail.style.display = 'grid';
        } else {
            throw new Error(data.error || 'სურათი ვერ მოიძებნა');
        }
    } catch (error) {
        console.error('Error loading image:', error);
        loadingState.style.display = 'none';
        errorState.style.display = 'block';
    }
}

function displayImageDetail(image) {
    document.getElementById('detailImage').src = image.image_url || '';
    document.getElementById('detailImage').alt = image.name || '';
    document.getElementById('detailTitle').textContent = image.name || 'უსახელო';
    document.getElementById('detailDescription').textContent = image.description || 'აღწერა არ არის მოწოდებული';
    
    if (image.price) {
        const imagePrice = parseFloat(image.price);
        document.getElementById('detailPrice').textContent = `${imagePrice.toFixed(2)} ₾`;
    } else {
        document.getElementById('detailPrice').textContent = 'ფასი არ არის მითითებული';
    }
    
    // Update create book button link with image_id
    const createBookBtn = document.getElementById('createBookBtn');
    if (createBookBtn && imageId) {
        createBookBtn.href = `./upload.html?image_id=${imageId}`;
    }
}

function showError(message) {
    const errorState = document.getElementById('errorState');
    const loadingState = document.getElementById('loadingState');
    loadingState.style.display = 'none';
    errorState.style.display = 'block';
    errorState.querySelector('p').textContent = message;
}


