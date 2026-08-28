const { db, reply, errorReply, defaults } = require('../_shared');

module.exports = async (req, res) => {
  try {
    const { data, error } = await db().from('cms_content').select('*').eq('id', 1).single();
    if (error && error.code !== 'PGRST116') throw error;
    return reply(res, 200, { content: data || defaults });
  } catch (error) {
    return errorReply(res, error);
  }
};
