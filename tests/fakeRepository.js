// In-memory stand-in for server/repository.js so the test suite can run
// completely offline (no network, no real Supabase project needed).
// It implements the exact same method names/shapes as the real repository.
function createFakeRepository() {
  const db = {
    users: [],
    children: [],
    conversations: [],
    messages: [],
    metrics: [],
  };
  let ids = { user: 1, child: 1, conversation: 1, message: 1, metric: 1 };

  return {
    _db: db, // exposed for assertions in tests only

    async findUserByEmail(email) {
      return db.users.find((u) => u.email === email) || null;
    },
    async getUserById(userId) {
      return db.users.find((u) => u.user_id === Number(userId)) || null;
    },
    async createUser({ username, email, passwordHash, isParent }) {
      const user = { user_id: ids.user++, username, email, password: passwordHash, is_parent: !!isParent };
      db.users.push(user);
      return user;
    },

    async saveChild({ name, age, parentId }) {
      const child = { child_id: ids.child++, child_name: name, age, parent_id: parentId };
      db.children.push(child);
      return child;
    },
    async getChildNamesByParentId(parentId) {
      return db.children.filter((c) => c.parent_id === Number(parentId)).map((c) => c.child_name);
    },
    async getChildIdByName(childName) {
      const child = db.children.find((c) => c.child_name === childName);
      return child ? child.child_id : null;
    },
    async getChildNamesByIds(childIds) {
      return db.children.filter((c) => childIds.includes(c.child_id)).map((c) => c.child_name);
    },

    async createConversation({ userId, startTime, childId = null }) {
      const conversation = {
        conversation_id: ids.conversation++,
        user_id: userId,
        start_time: startTime,
        end_time: null,
        favorite: null,
        child_id: childId,
      };
      db.conversations.push(conversation);
      return conversation;
    },
    async updateConversationEndTime(userId, endTime) {
      db.conversations.filter((c) => c.user_id === Number(userId)).forEach((c) => (c.end_time = endTime));
    },
    async getConversationsByUserId(userId) {
      return db.conversations.filter((c) => c.user_id === Number(userId));
    },
    async getChildIdsInConversationsByUser(userId) {
      return db.conversations.filter((c) => c.user_id === Number(userId) && c.child_id !== null).map((c) => c.child_id);
    },
    async getConversationIdByChildId(childId) {
      const matches = db.conversations.filter((c) => c.child_id === Number(childId));
      if (!matches.length) return null;
      return matches[matches.length - 1].conversation_id;
    },
    async setFavorite(conversationId, value) {
      const conversation = db.conversations.find((c) => c.conversation_id === Number(conversationId));
      if (conversation) conversation.favorite = value;
    },

    async insertMessage({ conversationId, sender, content, timestamp }) {
      const message = { message_id: ids.message++, conversation_id: conversationId, sender, message_content: content, timestamp };
      db.messages.push(message);
      return message;
    },
    async getMessagesByConversationId(conversationId) {
      return db.messages.filter((m) => m.conversation_id === Number(conversationId));
    },

    async insertMetric({ userId, childId = null, metricName, metricValue }) {
      const metric = { metric_id: ids.metric++, user_id: userId, child_id: childId, metric_name: metricName, metric_value: metricValue };
      db.metrics.push(metric);
      return metric;
    },
  };
}

module.exports = { createFakeRepository };
