# TopicTrail

TopicTrail is a smart lecture management platform powered by AI. It simplifies class and video lecture management with features like class creation, video transcription, topic search, AI-generated summaries, quizzes, and note-taking.

---

## Features

### User Management
- **User Authentication**:
  - Sign up using Gmail with OTP verification.
  - Secure login using JWT tokens.

### Class Management
- **Class Creation**:
  - Create a class with a unique class code.
  - Delete or manage your classes.
- **Join Classes**:
  - Join a class using the unique class code.
- **Member Management**:
  - Manage members within your classes.

### Content Management
- **Video Uploads**:
  - Seamlessly upload video lectures within classes.
- **AI Pipeline**:
  - **FFmpeg**: Converts video to audio for processing.
  - **Whisper**: Generates accurate transcriptions from audio.
  - **Grok**: Provides topic segmentation, summaries, and quiz generation.
- **Notes**:
  - Add notes to videos for better reference.

---

## Tech Stack

### Frontend
- **React.js**: For building a responsive and intuitive user interface.
- **Tailwind CSS**: Used for styling some components.

### Backend
- **Node.js**: Server-side runtime environment.
- **Express.js**: Web framework for handling APIs and server logic.

### AI Integration
- **FFmpeg**: Video-to-audio conversion.
- **Whisper**: For transcription generation ([Whisper Model](https://huggingface.co/openai/whisper-large-v3-turbo)).
- **Grok**: For topic segmentation, summaries, and quiz generation ([Grok Documentation](https://groq.com/)).

### Database
- **MongoDB**: To store class data, video metadata, and topic mappings.

---

## Getting Started

### Prerequisites

1. Install **Node.js** and **npm**.
2. Install **MongoDB**.
3. Install **FFmpeg** ([Download FFmpeg](https://www.ffmpeg.org/)).

---

### Installation

1. Clone the repository:
   ```bash
   git clone git@github.com:namita3599/Topic_Trail.git
   ```

2. Navigate to the project directory:
   ```bash
   cd Topic-Trail
   ```

3. Install dependencies for the frontend:
   ```bash
   cd frontend
   npm install
   ```

4. Install dependencies for the backend:
   ```bash
   cd backend
   npm install
   ```

---

### Usage

1. Start the backend server:
   ```bash
   cd backend
   npm start
   ```

2. Start the frontend server:
   ```bash
   cd frontend
   npm run dev
   ```

3. Add the necessary environment variables:

   frontend:
  
   ```env
   VITE_BASE_URL="backend URL"
   ```

   backend:

   ```env
   MONGO_CONN="mongodb+srv://<username>:<password>@cluster0.mongodb.net/auth-db?retryWrites=true&w=majority&appName=Cluster0"
   JWT_SECRET="your-jwt-secret"
   CLOUDINARY_CLOUD_NAME="your-cloudinary-cloud-name"
   CLOUDINARY_API_KEY="your-cloudinary-api-key"
   CLOUDINARY_API_SECRET="your-cloudinary-api-secret"
   HUGGINGFACE_API_KEY="your-huggingface-api-key"
   HUGGINGFACE_WHISPER_URL="https://api-inference.huggingface.co/models/openai/whisper-large-v3-turbo"
   HUGGINGFACE_QWEN_URL="https://api-inference.huggingface.co/models/Qwen/QwQ-32B-Preview"
   GROQ_API_KEY="your-groq-api-key"
   EMAIL_USER="your-email@gmail.com"
   EMAIL_PASSWORD="your-email-password"
   # NODE_EXTRA_CA_CERTS=cloudinary.crt
   ```

5. Access the application in your browser at `http://localhost:3000`.

---

## Contribution

We welcome contributions! To contribute:

1. Fork the repository.
2. Create a new branch with your improvements.
3. Submit a pull request for review.

---
