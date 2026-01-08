# Book Creator Backend API

Node.js Express backend for the book creator application using Neon PostgreSQL and Supabase Storage.

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the backend directory:

```env
PORT=3000
NODE_ENV=development

# Neon PostgreSQL Database
DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google AI (Gemini) Configuration
GOOGLE_API_KEY=your-google-api-key
```

### 3. Neon Database Setup

1. Go to [Neon Console](https://console.neon.tech/)
2. Create a new project
3. Copy the connection string
4. Add it to `.env` as `DATABASE_URL`

The database tables will be created automatically on first run.

### 4. Supabase Storage Setup

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Create a new project or use existing
3. Go to Settings > API
4. Copy your project URL and service role key
5. Add them to `.env`

6. Create a storage bucket:
   - Go to Storage in Supabase dashboard
   - Create a new bucket named `book-uploads`
   - Set it to public (or configure policies as needed)

### 5. Google AI (Gemini) Setup

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API Key" or go to API Keys section
4. Create a new API key
5. Copy the API key and add it to `.env` as `GOOGLE_API_KEY`
6. Make sure the Generative AI API is enabled for your project

## Running the Server

### Development mode (with auto-reload):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

The server will run on `http://localhost:3000`

## API Endpoints

### Health Check
- `GET /api/health` - Check if server is running

### Books (Neon Database)
- `GET /api/books` - Get all books
- `GET /api/books/:id` - Get single book
- `POST /api/books` - Create new book
- `PUT /api/books/:id` - Update book
- `DELETE /api/books/:id` - Delete book

### Upload (Supabase Storage)
- `POST /api/upload/single` - Upload single image
- `POST /api/upload/multiple` - Upload multiple images (max 10)

### AI (Google Gemini)
- `POST /api/ai/generate` - Generate text with AI
- `POST /api/ai/chat` - Chat with AI (with conversation history)
- `POST /api/ai/complete` - Complete text with AI
- `POST /api/ai/fairy-tale-characters` - Generate fairy tale characters from image URLs
- `POST /api/ai/replace-child` - Replace child in template image

### AI with Neon Database Integration (NEW)
- `POST /api/ai/fairy-tale-characters-from-db` - Generate fairy tale characters from images in Neon database
- `POST /api/ai/analyze-from-db` - Analyze and generate from image stored in Neon database
- `POST /api/ai/replace-child-from-db` - Replace child in template using images from Neon database

**See [GOOGLE-AI-NEON-INTEGRATION.md](./GOOGLE-AI-NEON-INTEGRATION.md) for detailed documentation.**

### Test & Diagnostics
- `GET /api/test/connections` - Test all connections (database, Google AI, Supabase)
- `GET /api/test/models` - List available Google AI models
- `GET /api/test/health` - Simple health check

## Example Requests

### Create Book
```json
POST /api/books
{
  "title": "My Book",
  "author": "Author Name",
  "images": ["https://supabase-url/storage/v1/object/public/book-uploads/image.jpg"]
}
```

### Upload Image
```
POST /api/upload/multiple
Content-Type: multipart/form-data
Form data: images[] (file array)
```

## Database Schema

The `books` table is automatically created with:
- `id` (SERIAL PRIMARY KEY)
- `title` (VARCHAR(255))
- `author` (VARCHAR(255))
- `images` (TEXT[] - array of Supabase URLs)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## Google AI + Neon Database Integration

The backend now supports fetching images directly from Neon database for Google AI processing:

1. **Store images in Neon database** - Images are stored in the `images` table with their URLs
2. **Process with Google AI** - Use image IDs to fetch from database and process with Google AI Studio
3. **Generate results** - Get AI-generated illustrations based on images from your database

### Quick Example

```javascript
// Process images from Neon database
const response = await fetch('http://localhost:3000/api/ai/analyze-from-db', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    imageId: 1,  // Image ID from Neon database
    backgroundImageId: 2  // Optional background image
  })
});

const result = await response.json();
console.log(result.data.generatedImageUrl);
```

### Testing the Integration

Run the test script to verify the integration:

```bash
node test-google-ai-neon.js
```

This will:
- Test database connection
- Retrieve images from Neon database
- Test Google AI functions with database images
- Test API endpoints

## Notes

- Images are stored in Supabase Storage bucket `book-uploads`
- Book data is stored in Neon PostgreSQL database
- Maximum file size: 10MB per image
- Maximum files per upload: 10
- Supported formats: JPEG, JPG, PNG, GIF, WEBP
- Google AI can now fetch images directly from Neon database using image IDs
