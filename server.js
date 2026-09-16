require('dotenv').config();
const path = require('path');
const { createApp } = require('./server/app');
const { createRepository } = require('./server/repository');
const supabase = require('./server/supabaseClient');
const { runChat } = require('./server/geminiChat');

process.env.TZ = 'UTC';

const repo = createRepository(supabase);

const app = createApp({
  repo,
  runChat,
  sessionSecret: process.env.SESSION_SECRET,
  publicDir: path.join(__dirname, 'public'),
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
  console.log('Try GET /health to verify the Supabase connection.');
});
