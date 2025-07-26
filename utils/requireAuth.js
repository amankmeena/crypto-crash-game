function requireAuth(req, res, next) {
  // console.log('req.session: ' + req.session.player)
  if (!req.session.player) {
    return res.redirect('/login');
  }

  next();
}

module.exports = requireAuth;