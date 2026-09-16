/**
 * Data access layer.
 *
 * Every function returns a plain JS value (or throws) and hides the
 * Supabase query-builder syntax from the routes. Keeping this in one
 * file also means the whole app can be unit-tested with a fake
 * in-memory implementation (see tests/fakeRepository.js) without ever
 * touching the network.
 */
function createRepository(supabase) {
  async function unwrap(promise) {
    const { data, error } = await promise;
    if (error) throw error;
    return data;
  }

  return {
    // ---- users -------------------------------------------------------
    async findUserByEmail(email) {
      const rows = await unwrap(
        supabase.from('users').select('*').eq('email', email).limit(1)
      );
      return rows[0] || null;
    },

    async getUserById(userId) {
      const rows = await unwrap(
        supabase.from('users').select('*').eq('user_id', userId).limit(1)
      );
      return rows[0] || null;
    },

    async createUser({ username, email, passwordHash, isParent }) {
      const rows = await unwrap(
        supabase
          .from('users')
          .insert({ username, email, password: passwordHash, is_parent: !!isParent })
          .select()
      );
      return rows[0];
    },

    // ---- children ------------------------------------------------------
    async saveChild({ name, age, parentId }) {
      const rows = await unwrap(
        supabase
          .from('children')
          .insert({ child_name: name, age, parent_id: parentId })
          .select()
      );
      return rows[0];
    },

    async getChildNamesByParentId(parentId) {
      const rows = await unwrap(
        supabase.from('children').select('child_name').eq('parent_id', parentId)
      );
      return rows.map((r) => r.child_name);
    },

    async getChildIdByName(childName) {
      const rows = await unwrap(
        supabase.from('children').select('child_id').eq('child_name', childName).limit(1)
      );
      return rows[0] ? rows[0].child_id : null;
    },

    async getChildNamesByIds(childIds) {
      if (!childIds.length) return [];
      const rows = await unwrap(
        supabase.from('children').select('child_name').in('child_id', childIds)
      );
      return rows.map((r) => r.child_name);
    },

    // ---- conversations ---------------------------------------------------
    async createConversation({ userId, startTime, childId = null }) {
      const rows = await unwrap(
        supabase
          .from('conversations')
          .insert({ user_id: userId, start_time: startTime, child_id: childId })
          .select()
      );
      return rows[0];
    },

    async updateConversationEndTime(userId, endTime) {
      await unwrap(
        supabase.from('conversations').update({ end_time: endTime }).eq('user_id', userId)
      );
    },

    async getConversationsByUserId(userId) {
      return unwrap(
        supabase
          .from('conversations')
          .select('*')
          .eq('user_id', userId)
          .order('conversation_id', { ascending: false })
      );
    },

    async getChildIdsInConversationsByUser(userId) {
      const rows = await unwrap(
        supabase.from('conversations').select('child_id').eq('user_id', userId)
      );
      return rows.map((r) => r.child_id).filter((id) => id !== null);
    },

    async getConversationIdByChildId(childId) {
      const rows = await unwrap(
        supabase
          .from('conversations')
          .select('conversation_id')
          .eq('child_id', childId)
          .order('conversation_id', { ascending: false })
          .limit(1)
      );
      return rows[0] ? rows[0].conversation_id : null;
    },

    async setFavorite(conversationId, value) {
      await unwrap(
        supabase.from('conversations').update({ favorite: value }).eq('conversation_id', conversationId)
      );
    },

    // ---- messages ------------------------------------------------------
    async insertMessage({ conversationId, sender, content, timestamp }) {
      const rows = await unwrap(
        supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender,
            message_content: content,
            timestamp,
          })
          .select()
      );
      return rows[0];
    },

    async getMessagesByConversationId(conversationId) {
      return unwrap(
        supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('message_id', { ascending: true })
      );
    },

    // ---- metrics ---------------------------------------------------------
    async insertMetric({ userId, childId = null, metricName, metricValue }) {
      const rows = await unwrap(
        supabase
          .from('asd_metrics')
          .insert({ user_id: userId, child_id: childId, metric_name: metricName, metric_value: metricValue })
          .select()
      );
      return rows[0];
    },
  };
}

module.exports = { createRepository };
