const { db, reply, errorReply, defaults } = require('../_shared');

module.exports = async (req, res) => {
  try {
    const { data, error } = await db()
      .from('cms_content')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const content = data || defaults;

    return reply(res, 200, { content });
  } catch (error) {
    return errorReply(res, error);
  }
};
