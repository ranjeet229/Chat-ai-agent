import 'dotenv/config';
import express from 'express';
import OpenAI from 'openai';
import { MemoryStore } from './src/memory.js';
import { buildAgentInput, normalizeGroqResponse } from './src/agent.js';

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static('public'));

const store = new MemoryStore({ uri: process.env.MONGODB_URI, dbName: process.env.MONGODB_DB });
await store.connect();
// Constructing lazily lets the UI start and explain setup before a key exists.
const getClient = () => new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });
const model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

app.get('/api/conversations', async (_req, res) => res.json(await store.listConversations()));
app.get('/api/conversations/:id', async (req, res) => {
  const conversation = await store.getConversation(req.params.id);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found.' });
  res.json(conversation);
});

app.post('/api/chat', async (req, res) => {
  const text = String(req.body?.message || '').trim();
  let conversationId = req.body?.conversationId;
  if (!text) return res.status(400).json({ error: 'A message is required.' });
  if (!process.env.GROQ_API_KEY) return res.status(500).json({ error: 'Set GROQ_API_KEY in .env and restart.' });
  try {
    const conversation = await store.ensureConversation(conversationId);
    conversationId = conversation.id;
    const userMessage = await store.addMessage(conversationId, { role: 'user', content: text });
    const relevant = await store.retrieve(conversationId, text, userMessage.createdAt);
    const input = buildAgentInput({ message: text, relevant, now: new Date().toISOString() });
    const response = await getClient().responses.create({
      model,
      input,
      tools: [{ type: 'browser_search' }],
      tool_choice: 'auto'
    });
    const answer = normalizeGroqResponse(response);
    const assistantMessage = await store.addMessage(conversationId, { role: 'assistant', content: answer.text, citations: answer.citations });
    res.json({ conversationId, message: assistantMessage });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error?.message || 'The agent could not complete that request.' });
  }
});

app.post('/api/conversations', async (_req, res) => res.status(201).json(await store.createConversation()));

if (!process.env.VERCEL) {
  app.listen(process.env.PORT || 3000, () => console.log(`Minimi listening on http://localhost:${process.env.PORT || 3000}`));
}

export default app;
