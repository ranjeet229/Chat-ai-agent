# Minimi

Minimi is a web-grounded AI chat agent with temporal memory. It uses Groq's browser search to answer questions that may have changed and MongoDB to persist conversations and messages.

## Features

- Conversational web UI with persistent chat history
- Web search for current information, recommendations, prices, releases, and verification
- Timestamped conversation memory for temporal follow-up questions
- Lexical retrieval of relevant older messages
- Clickable source citations returned by web search

## Requirements

- Node.js 18 or newer
- A MongoDB deployment and connection string
- A Groq API key with access to the configured model and browser search

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root:

   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017
   MONGODB_DB=minimi
   GROQ_API_KEY=your_groq_api_key
   GROQ_MODEL=openai/gpt-oss-20b
   PORT=3000
   ```

   `MONGODB_URI` and `GROQ_API_KEY` are required. `MONGODB_DB`, `GROQ_MODEL`, and `PORT` are optional.

3. Start the server:

   ```bash
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000).

For development with automatic server restarts:

```bash
npm run dev
```

## Deploying to Vercel

1. Push the project to GitHub, GitLab, or Bitbucket.
2. In [Vercel](https://vercel.com), select **Add New Project**, import the repository, and keep the default Node.js settings.
3. Add these environment variables in the project settings:

   ```text
   MONGODB_URI=<your MongoDB connection string>
   MONGODB_DB=minimi
   GROQ_API_KEY=<your Groq API key>
   GROQ_MODEL=openai/gpt-oss-20b
   ```

   Add them for the **Production** environment, and for **Preview** too if you want preview deployments to work.

4. Deploy the project. Vercel uses [`vercel.json`](./vercel.json) to route browser and API requests to the Express application.

The deployed app needs a MongoDB service reachable from the internet, such as MongoDB Atlas. In MongoDB Atlas, add the Vercel connection IP range or temporarily allow `0.0.0.0/0` while testing, then restrict access according to your security requirements.

The Vercel serverless entry point is [`api/index.js`](./api/index.js). After pushing changes, trigger a new Vercel deployment and open the new deployment URL.

## Usage

Ask Minimi a question in the chat interface. It uses the web when freshness matters and includes source links when search results are used. Start a new conversation with **New chat**.

## API

- `POST /api/chat` - Send a message. Accepts `message` and an optional `conversationId`.
- `POST /api/conversations` - Create a conversation.
- `GET /api/conversations` - List conversations.
- `GET /api/conversations/:id` - Get a conversation and its messages.

## Project structure

```text
server.js          Express server and API routes
src/agent.js       Agent prompt construction and response normalization
src/memory.js      MongoDB persistence and memory retrieval
public/             Browser UI
DESIGN.md          Architecture and design rationale
```

## Testing

Run the Node.js test suite with:

```bash
npm test
```
