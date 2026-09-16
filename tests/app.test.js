const test = require('node:test');
const assert = require('node:assert/strict');

const { createApp } = require('../server/app');
const { createFakeRepository } = require('./fakeRepository');
const { startServer, makeAgent } = require('./testServer');

async function setup() {
  const repo = createFakeRepository();
  const runChat = async (userInput) => `echo: ${userInput}`;
  const app = createApp({ repo, runChat, sessionSecret: 'test-secret', publicDir: __dirname + '/../public' });
  const { server, baseUrl } = await startServer(app);
  return {
    repo,
    close: () => new Promise((resolve) => server.close(resolve)),
    agent: () => makeAgent(baseUrl),
  };
}

test('signup rejects a duplicate email', async () => {
  const { agent, close } = await setup();
  try {
    const first = await agent().post('/signup', { username: 'aissa', email: 'a@test.com', password: 'secret123' });
    assert.equal(first.status, 200);
    assert.equal(first.body.message, 'Signup successful');

    const second = await agent().post('/signup', { username: 'other', email: 'a@test.com', password: 'x' });
    assert.equal(second.status, 400);
    assert.match(second.body.error, /already exists/);
  } finally {
    await close();
  }
});

test('passwords are hashed, not stored in plain text', async () => {
  const { agent, repo, close } = await setup();
  try {
    await agent().post('/signup', { username: 'bob', email: 'bob@test.com', password: 'plainpassword' });
    const stored = await repo.findUserByEmail('bob@test.com');
    assert.notEqual(stored.password, 'plainpassword');
    assert.ok(stored.password.startsWith('scrypt:'));
  } finally {
    await close();
  }
});

test('login fails with the wrong password and succeeds with the right one', async () => {
  const { agent, close } = await setup();
  try {
    await agent().post('/signup', { username: 'zoe', email: 'zoe@test.com', password: 'correct-horse' });

    const badLogin = await agent().post('/login', { email: 'zoe@test.com', password: 'wrong' });
    assert.equal(badLogin.status, 401);

    const goodLogin = await agent().post('/login', { email: 'zoe@test.com', password: 'correct-horse' });
    assert.equal(goodLogin.status, 200);
    assert.equal(goodLogin.body.username, 'zoe');
    assert.ok(goodLogin.body.conversationId);
  } finally {
    await close();
  }
});

test('protected routes reject unauthenticated requests', async () => {
  const { agent, close } = await setup();
  try {
    const res = await agent().post('/chat', { userInput: 'hi' });
    assert.equal(res.status, 401);
  } finally {
    await close();
  }
});

test('two different logged-in users do not share chat state (regression test for the old global-variable bug)', async () => {
  const { agent, close } = await setup();
  try {
    const agentA = agent();
    const agentB = agent();

    await agentA.post('/signup', { username: 'userA', email: 'userA@test.com', password: 'pw12345' });
    await agentB.post('/signup', { username: 'userB', email: 'userB@test.com', password: 'pw12345' });

    const chatA = await agentA.post('/chat', { userInput: 'hello from A' });
    const chatB = await agentB.post('/chat', { userInput: 'hello from B' });

    assert.equal(chatA.status, 200);
    assert.equal(chatB.status, 200);
    assert.equal(chatA.body.response, 'echo: hello from A');
    assert.equal(chatB.body.response, 'echo: hello from B');

    const convosA = await agentA.get('/conversations');
    const convosB = await agentB.get('/conversations');
    const idsA = convosA.body.map((c) => c.conversation_id);
    const idsB = convosB.body.map((c) => c.conversation_id);
    assert.equal(idsA.some((id) => idsB.includes(id)), false, 'users must not see each other conversations');
  } finally {
    await close();
  }
});

test('full chat flow stores both the user message and the bot reply', async () => {
  const { agent, repo, close } = await setup();
  try {
    const a = agent();
    const signup = await a.post('/signup', { username: 'chatty', email: 'chatty@test.com', password: 'pw12345' });
    const conversationId = signup.body.conversationId;

    await a.post('/chat', { userInput: 'What is autism?' });

    const messages = await repo.getMessagesByConversationId(conversationId);
    assert.equal(messages.length, 2);
    assert.equal(messages[0].sender, 'user');
    assert.equal(messages[0].message_content, 'What is autism?');
    assert.equal(messages[1].sender, 'bot');
    assert.equal(messages[1].message_content, 'echo: What is autism?');
  } finally {
    await close();
  }
});

test('saveChild + getnames round-trip', async () => {
  const { agent, close } = await setup();
  try {
    const a = agent();
    await a.post('/signup', { username: 'parent1', email: 'parent1@test.com', password: 'pw12345', is_parent: true });

    const saveRes = await a.post('/saveChild', { name: 'Ahmed', age: 10 });
    assert.equal(saveRes.status, 200);

    const namesRes = await a.get('/getnames');
    assert.equal(namesRes.status, 200);
    assert.deepEqual(namesRes.body.childNames, ['Ahmed']);
  } finally {
    await close();
  }
});

test('both spellings of the create-child-conversation route work (fixes original 404 bug)', async () => {
  const { agent, close } = await setup();
  try {
    const a = agent();
    await a.post('/signup', { username: 'parent2', email: 'parent2@test.com', password: 'pw12345', is_parent: true });
    await a.post('/saveChild', { name: 'Sara', age: 8 });
    await a.get('/getConversationMessage?childName=Sara');

    const capital = await a.post('/createConversationChild', {});
    assert.equal(capital.status, 200);

    const lower = await a.post('/createConversationchild', {});
    assert.equal(lower.status, 200);
  } finally {
    await close();
  }
});

test('addFavorite toggles the favorite flag', async () => {
  const { agent, repo, close } = await setup();
  try {
    const a = agent();
    const signup = await a.post('/signup', { username: 'fave', email: 'fave@test.com', password: 'pw12345' });

    const res = await a.post('/addFavorite', { favoriteid: signup.body.conversationId, value: true });
    assert.equal(res.status, 200);

    const user = await repo.findUserByEmail('fave@test.com');
    const convos = await repo.getConversationsByUserId(user.user_id);
    assert.equal(convos[0].favorite, true);
  } finally {
    await close();
  }
});
