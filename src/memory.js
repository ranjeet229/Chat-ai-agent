import crypto from 'node:crypto';
import { MongoClient } from 'mongodb';

const id = () => crypto.randomUUID();
const terms = text => new Set(String(text).toLowerCase().match(/[a-z0-9][a-z0-9.+-]{1,}/g) || []);
const score = (query, content) => {
  const q = terms(query), c = terms(content); let hits = 0;
  for (const term of q) if (c.has(term)) hits++;
  return hits / Math.max(q.size, 1);
};

export class MemoryStore {
  constructor({ uri, dbName }) {
    if (!uri) throw new Error('Set MONGODB_URI in .env before starting Minimi.');
    this.client = new MongoClient(uri);
    this.dbName = dbName || 'minimi';
  }

  async connect() {
    await this.client.connect();
    this.db = this.client.db(this.dbName);
    this.conversations = this.db.collection('conversations');
    this.messages = this.db.collection('messages');
    await Promise.all([
      this.conversations.createIndex({ id: 1 }, { unique: true }),
      this.messages.createIndex({ conversationId: 1, createdAt: 1 }),
      this.messages.createIndex({ conversationId: 1, content: 'text' })
    ]);
  }

  async createConversation() {
    const conversation = { id: id(), createdAt: new Date().toISOString(), title: 'New conversation' };
    await this.conversations.insertOne(conversation);
    return conversation;
  }

  async ensureConversation(conversationId) {
    if (conversationId) {
      const existing = await this.conversations.findOne({ id: conversationId }, { projection: { _id: 0 } });
      if (existing) return existing;
    }
    return this.createConversation();
  }

  async listConversations() {
    return this.conversations.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
  }

  async getConversation(conversationId) {
    const conversation = await this.conversations.findOne({ id: conversationId }, { projection: { _id: 0 } });
    if (!conversation) return null;
    const messages = await this.messages.find({ conversationId }, { projection: { _id: 0, conversationId: 0 } }).sort({ createdAt: 1 }).toArray();
    return { ...conversation, messages };
  }

  async addMessage(conversationId, message) {
    const item = { id: id(), conversationId, ...message, createdAt: new Date().toISOString() };
    await this.messages.insertOne(item);
    if (message.role === 'user') await this.conversations.updateOne({ id: conversationId, title: 'New conversation' }, { $set: { title: message.content.slice(0, 72) } });
    const { conversationId: _ignored, ...publicItem } = item;
    return publicItem;
  }

  async retrieve(conversationId, query) {
    const messages = await this.messages.find({ conversationId }, { projection: { _id: 0, conversationId: 0 } }).sort({ createdAt: 1 }).toArray();
    const recent = messages.slice(-10);
    const older = messages.slice(0, -10).map(m => ({ m, s: score(query, m.content) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 8).map(x => x.m);
    return [...new Map([...older, ...recent].map(m => [m.id, m])).values()].map(({ role, content, createdAt, citations }) => ({ role, content, createdAt, citations }));
  }
}
