const path = require('path');
const express = require('express');
const session = require('express-session');
const { hashPassword, verifyPassword } = require('./passwords');

/**
 * Builds the Express app. `repo` and `runChat` are injected so the whole
 * app can be exercised in tests with fakes, and so server.js is the only
 * file that ever touches the real Supabase project / Gemini API.
 */
function createApp({ repo, runChat, sessionSecret, publicDir }) {
  const app = express();

  app.use(express.json());
  app.use(
    session({
      secret: sessionSecret || 'dev-only-secret-change-me',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 8, // 8 hours
      },
    })
  );

  app.use(express.static(publicDir));

  // ---- helpers -----------------------------------------------------------
  function requireAuth(req, res, next) {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated. Please log in again.' });
    }
    next();
  }

  async function buildLoginPayload(user) {
    const childIds = await repo.getChildIdsInConversationsByUser(user.user_id);
    const children = await repo.getChildNamesByIds(childIds);
    return {
      username: user.username,
      userEmail: user.email,
      isParent: !!user.is_parent,
      children,
    };
  }

  // ---- pages ---------------------------------------------------------------
  app.get('/', (req, res) => res.redirect('/index'));
  app.get('/index', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));
  app.get('/signup', (req, res) => res.sendFile(path.join(publicDir, 'signup.html')));

  // ---- auth ------------------------------------------------------------------
  app.post('/signup', async (req, res) => {
    try {
      const { username, email, password, is_parent } = req.body || {};
      if (!username || !email || !password) {
        return res.status(400).json({ error: 'username, email and password are required' });
      }

      const existing = await repo.findUserByEmail(email);
      if (existing) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      const passwordHash = hashPassword(password);
      const user = await repo.createUser({ username, email, passwordHash, isParent: !!is_parent });

      const startTime = new Date().toISOString();
      const conversation = await repo.createConversation({ userId: user.user_id, startTime });

      req.session.userId = user.user_id;
      req.session.username = user.username;
      req.session.isParent = !!user.is_parent;
      req.session.conversationId = conversation.conversation_id;

      res.status(200).json({
        message: 'Signup successful',
        userEmail: user.email,
        conversationId: conversation.conversation_id,
        isParent: !!user.is_parent,
        children: [],
      });
    } catch (error) {
      console.error('Error in /signup:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: 'email and password are required' });
      }

      const user = await repo.findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const passwordOk = verifyPassword(password, user.password);
      if (!passwordOk) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const startTime = new Date().toISOString();
      const conversation = await repo.createConversation({ userId: user.user_id, startTime });

      req.session.userId = user.user_id;
      req.session.username = user.username;
      req.session.isParent = !!user.is_parent;
      req.session.conversationId = conversation.conversation_id;

      const payload = await buildLoginPayload(user);
      res.status(200).json({ message: 'Login successful', conversationId: conversation.conversation_id, ...payload });
    } catch (error) {
      console.error('Error in /login:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/logout', (req, res) => {
    req.session.destroy(() => res.status(200).json({ message: 'Logged out' }));
  });

  // ---- conversations ---------------------------------------------------------
  app.post('/insertConversation', requireAuth, async (req, res) => {
    try {
      const { startTime, endTime, favorite } = req.body || {};
      const conversation = await repo.createConversation({
        userId: req.session.userId,
        startTime: startTime || new Date().toISOString(),
      });
      if (endTime) await repo.updateConversationEndTime(req.session.userId, endTime);
      if (typeof favorite !== 'undefined') await repo.setFavorite(conversation.conversation_id, favorite);
      req.session.conversationId = conversation.conversation_id;
      res.status(200).json({ message: 'Conversation inserted successfully', conversationId: conversation.conversation_id });
    } catch (error) {
      console.error('Error in /insertConversation:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/terminateChat', requireAuth, async (req, res) => {
    try {
      const { endTime } = req.body || {};
      await repo.updateConversationEndTime(req.session.userId, endTime || new Date().toISOString());
      res.status(200).json({ message: 'Chat terminated successfully' });
    } catch (error) {
      console.error('Error in /terminateChat:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/createConversation', requireAuth, async (req, res) => {
    try {
      const { childId } = req.body || {};
      const startTime = new Date().toISOString();
      const conversation = await repo.createConversation({ userId: req.session.userId, startTime, childId: childId || null });
      req.session.conversationId = conversation.conversation_id;
      res.status(200).json({ message: 'Conversation created successfully', conversationId: conversation.conversation_id });
    } catch (error) {
      console.error('Error creating conversation:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/conversations', requireAuth, async (req, res) => {
    try {
      const conversations = await repo.getConversationsByUserId(req.session.userId);
      if (conversations.length > 0) req.session.conversationId = conversations[0].conversation_id;
      res.json(conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/messages', requireAuth, async (req, res) => {
    try {
      const conversationId = req.query.conversationId;
      if (!conversationId) return res.status(400).json({ error: 'No conversation ID available' });
      const messages = await repo.getMessagesByConversationId(conversationId);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/addFavorite', requireAuth, async (req, res) => {
    try {
      const { value, favoriteid } = req.body || {};
      await repo.setFavorite(favoriteid, value);
      res.status(200).json({ message: 'Favorite status updated successfully.' });
    } catch (error) {
      console.error('Error adding favorite:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ---- chat --------------------------------------------------------------------
  app.post('/chat', requireAuth, async (req, res) => {
    try {
      const userInput = req.body && req.body.userInput;
      if (!userInput) return res.status(400).json({ error: 'Invalid request body' });
      if (!req.session.conversationId) return res.status(400).json({ error: 'Conversation ID not set' });

      const response = await runChat(userInput);
      const timestamp = new Date().toISOString();
      await repo.insertMessage({ conversationId: req.session.conversationId, sender: 'user', content: userInput, timestamp });
      await repo.insertMessage({ conversationId: req.session.conversationId, sender: 'bot', content: response, timestamp });
      res.json({ response });
    } catch (error) {
      console.error('Error in /chat endpoint:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/chat2', requireAuth, async (req, res) => {
    try {
      const userInput = req.body && req.body.userInput;
      const conversationId = (req.body && req.body.conversation_id) || req.session.conversationId;
      if (!userInput) return res.status(400).json({ error: 'Invalid request body' });
      if (!conversationId) return res.status(400).json({ error: 'Conversation ID not set' });

      const response = await runChat(userInput);
      const timestamp = new Date().toISOString();
      await repo.insertMessage({ conversationId, sender: 'user', content: userInput, timestamp });
      await repo.insertMessage({ conversationId, sender: 'bot', content: response, timestamp });
      res.json({ response });
    } catch (error) {
      console.error('Error in /chat2 endpoint:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // ---- children ------------------------------------------------------------------
  app.post('/saveChild', requireAuth, async (req, res) => {
    try {
      const { name, age } = req.body || {};
      if (!name) return res.status(400).json({ error: 'Child name is required' });
      const child = await repo.saveChild({ name, age, parentId: req.session.userId });
      res.status(200).json({ message: 'Child saved successfully', childId: child.child_id });
    } catch (error) {
      console.error('Error saving child to database:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/getnames', requireAuth, async (req, res) => {
    try {
      const childNames = await repo.getChildNamesByParentId(req.session.userId);
      res.status(200).json({ childNames, user: req.session.username });
    } catch (error) {
      console.error('Error retrieving child names:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/isparent', requireAuth, async (req, res) => {
    try {
      const user = await repo.getUserById(req.session.userId);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.status(200).json({ isParent: !!user.is_parent });
    } catch (error) {
      console.error('Error checking isParent:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ---- per-child conversation flow -------------------------------------------------
  app.get('/getConversationMessage', requireAuth, async (req, res) => {
    try {
      const childName = req.query.childName;
      if (!childName) return res.status(400).json({ error: 'childName is required' });

      const childId = await repo.getChildIdByName(childName);
      if (!childId) return res.status(404).json({ error: 'Child not found' });

      const conversationId = await repo.getConversationIdByChildId(childId);
      req.session.childChat = { childId, conversationId };

      const messages = conversationId ? await repo.getMessagesByConversationId(conversationId) : [];
      res.status(200).json({ messages, conversationId });
    } catch (error) {
      console.error('Error fetching conversation message:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  async function createChildConversationHandler(req, res) {
    try {
      const childId = (req.body && req.body.childId) || (req.session.childChat && req.session.childChat.childId);
      if (!childId) return res.status(400).json({ error: 'No child selected' });

      const startTime = new Date().toISOString();
      const conversation = await repo.createConversation({ userId: req.session.userId, startTime, childId });
      req.session.childChat = { childId, conversationId: conversation.conversation_id };
      res.status(200).json({ message: 'Conversation created successfully', conversationId: conversation.conversation_id });
    } catch (error) {
      console.error('Error creating conversation for child:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  // The original front-end code calls both spellings in different places;
  // both are wired to the same handler so neither call silently 404s.
  app.post('/createConversationChild', requireAuth, createChildConversationHandler);
  app.post('/createConversationchild', requireAuth, createChildConversationHandler);

  app.post('/chatchild', requireAuth, async (req, res) => {
    try {
      const userInput = req.body && req.body.userInput;
      const conversationId = req.session.childChat && req.session.childChat.conversationId;
      if (!userInput) return res.status(400).json({ error: 'Invalid request body' });
      if (!conversationId) return res.status(400).json({ error: 'Conversation ID not set' });

      const response = await runChat(userInput);
      const timestamp = new Date().toISOString();
      await repo.insertMessage({ conversationId, sender: 'user', content: userInput, timestamp });
      await repo.insertMessage({ conversationId, sender: 'bot', content: response, timestamp });
      res.json({ response });
    } catch (error) {
      console.error('Error in /chatchild endpoint:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // ---- ASD screening metrics ----------------------------------------------------
  app.post('/insertmetric', requireAuth, async (req, res) => {
    try {
      const { metric_name, metric_value } = req.body || {};
      if (!metric_name || typeof metric_value === 'undefined') {
        return res.status(400).json({ error: 'metric_name and metric_value are required.' });
      }
      const childId = req.session.childChat && req.session.childChat.childId;
      await repo.insertMetric({ userId: req.session.userId, childId, metricName: metric_name, metricValue: metric_value });
      res.status(200).json({ message: 'Metric inserted successfully.' });
    } catch (error) {
      console.error('Error inserting metric:', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  });

  // ---- health check (useful for smoke-testing the Supabase connection) --------
  app.get('/health', async (req, res) => {
    try {
      await repo.findUserByEmail('__healthcheck__@example.invalid');
      res.status(200).json({ status: 'ok', database: 'reachable' });
    } catch (error) {
      res.status(500).json({ status: 'error', database: 'unreachable', message: error.message });
    }
  });

  return app;
}

module.exports = { createApp };
