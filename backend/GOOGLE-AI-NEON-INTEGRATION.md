# Google AI Studio + Neon Console Integration

This integration allows Google AI Studio to fetch and process images directly from your Neon PostgreSQL database.

## Setup

### 1. Environment Variables

Make sure you have the following in your `.env` file:

```env
DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require
GOOGLE_API_KEY=your_google_ai_api_key
```

### 2. Database Schema

The integration uses the existing `images` table in your Neon database:

```sql
CREATE TABLE IF NOT EXISTS images (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2),
    image_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### 1. Generate Fairy Tale Characters from Database

**Endpoint:** `POST /api/ai/fairy-tale-characters-from-db`

**Description:** Fetches images from Neon database by IDs and generates fairy tale characters using Google AI.

**Request Body:**
```json
{
  "imageIds": [1, 2, 3],
  "backgroundImageId": 5,
  "model": "gemini-2.5-flash"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "characters": [
      {
        "success": true,
        "generatedImageUrl": "https://image.pollinations.ai/...",
        "backgroundUsed": true
      }
    ],
    "backgroundUsed": true
  },
  "message": "Processed 3 image(s) from Neon database"
}
```

### 2. Analyze and Generate from Database

**Endpoint:** `POST /api/ai/analyze-from-db`

**Description:** Analyzes a single image from Neon database and generates a new illustration.

**Request Body:**
```json
{
  "imageId": 1,
  "backgroundImageId": 2,
  "model": "gemini-2.5-flash"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "generatedImageUrl": "https://image.pollinations.ai/...",
    "backgroundUsed": true
  },
  "message": "Image processed from Neon database successfully"
}
```

### 3. Replace Child in Template from Database

**Endpoint:** `POST /api/ai/replace-child-from-db`

**Description:** Replaces a child in a template image using images stored in Neon database.

**Request Body:**
```json
{
  "childImageId": 1,
  "templateImageId": 2,
  "model": "gemini-2.5-flash"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "generatedImageUrl": "https://image.pollinations.ai/...",
    "prompt": "Detailed prompt used for generation..."
  },
  "message": "Child replaced in template using images from Neon database"
}
```

## Usage Examples

### Example 1: Process Multiple Images from Database

```javascript
const response = await fetch('http://localhost:3000/api/ai/fairy-tale-characters-from-db', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    imageIds: [1, 2, 3],
    backgroundImageId: 5
  })
});

const result = await response.json();
console.log(result);
```

### Example 2: Analyze Single Image from Database

```javascript
const response = await fetch('http://localhost:3000/api/ai/analyze-from-db', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    imageId: 1,
    backgroundImageId: 2
  })
});

const result = await response.json();
console.log(result.data.generatedImageUrl);
```

### Example 3: Replace Child in Template

```javascript
const response = await fetch('http://localhost:3000/api/ai/replace-child-from-db', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    childImageId: 1,
    templateImageId: 2
  })
});

const result = await response.json();
console.log(result.data.generatedImageUrl);
```

## How It Works

1. **Image Retrieval**: The system fetches image records from Neon database using the provided image IDs
2. **URL Extraction**: Extracts the `image_url` field from each database record
3. **Google AI Processing**: Passes the image URLs to Google AI Studio for analysis and generation
4. **Result Generation**: Returns the generated image URLs and metadata

## Database Helper Functions

The integration includes helper functions in `backend/config/database.js`:

- `getImageById(imageId)` - Fetch a single image by ID
- `getImagesByIds(imageIds)` - Fetch multiple images by IDs
- `getAllImages(limit)` - Fetch all images (with optional limit)

## Error Handling

All endpoints return appropriate error messages if:
- Image IDs are missing or invalid
- Images are not found in the database
- Google AI API errors occur
- Database connection issues

## Notes

- Images must be stored in the `images` table with valid `image_url` values
- The `image_url` should be accessible URLs (can be from Supabase Storage, CDN, etc.)
- Background images are optional for most endpoints
- The system automatically handles rate limiting and retries for Google AI API calls

