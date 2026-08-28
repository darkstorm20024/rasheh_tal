const { user, adminOK, reply, errorReply, db } = require('./_shared');

module.exports = async (req, res) => {
  try {
    const currentUser = await user(req);
    const isAdmin = adminOK(currentUser);

    if (isAdmin) {
      return reply(res, 200, {
        ok: true,
        user: { id: currentUser.id, email: currentUser.email },
        profile: { is_admin: true, company_name: 'رَشّح - الإدارة' }
      });
    }

    const { data, error } = await db()
      .from('clients')
      .select('*')
      .eq('auth_user_id', currentUser.id)
      .single();

    if (error || !data) {
      return reply(res, 200, {
        ok: true,
        user: { id: currentUser.id, email: currentUser.email },
        profile: null
      });
    }

    return reply(res, 200, {
      ok: true,
      user: { id: currentUser.id, email: currentUser.email },
      profile: { ...data, is_admin: false }
    });
  } catch (error) {
    return errorReply(res, error);
  }
};
