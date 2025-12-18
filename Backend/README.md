# LearnLive AI Backend

Powered by **Motia Unified Runtime**.

## 🚀 Features
- **Multi-Language**: TypeScript API Steps + Python AI Workers.
- **Event-Driven**: 10+ events orchestrating the entire learning capabilities.
- **Durable Workflows**: Resilient processes for Quiz Generation and Oral Tests.
- **Real-time**: Streaming PDF uploads and Chat.
- **Automated**: 4 Cron jobs for summaries and maintenance.

## 🛠️ Setup

1. **Install Dependencies**
   ```bash
   npm install
   pip install -r requirements.txt
   ```

2. **Environment Variables**
   Create a `.env` file in this directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Open Workbench**
   Access [http://localhost:3000](http://localhost:3000) to view the Step Graph and trigger workflows.

## 📂 Project Structure
- `src/steps/`: All Motia Steps (API, Event, Cron).
- `lib/`: Shared utilities (Mock DB).
- `motia.config.ts`: Motia configuration.

## 🧪 Testing Flows
- **Quiz**: POST `/generate-quiz` -> Visualized in Workbench.
- **Oral Test**: POST `/submit-answer` -> Returns speakable text.
- **Chat**: POST `/chat` -> Streams response.