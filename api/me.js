const { user, profile, reply, errorReply } = require('./_shared');

module.exports = async (req, res) => {
  try {
    const currentUser = await user(req);
    const currentProfile = await profile(req);
    return reply(res, 200, {
      ok: true,
      user: { id: currentUser.id, email: currentUser.email },
      profile: currentProfile
    });
  } catch (error) {
    return errorReply(res, error);
  }
};
