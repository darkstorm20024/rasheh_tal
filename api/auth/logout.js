const { reply } = require('../_shared');

module.exports = async (req, res) => {
  return reply(res, 200, { ok: true });
};
