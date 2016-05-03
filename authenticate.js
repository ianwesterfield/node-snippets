var helpers = require('./helpers');
var chalk = require('chalk');

function Authenticate() {
  return function(req, res, next) {
    return Authenticate.isAuthorized(null, null, req, res, next);
  }
}

Authenticate.isAuthorized = function(type, required, req, res, next) {
  if (!required || required.length == 0) {
    return next();
  }

  switch (type) {
    case 'permissions': {
      req.authorized = helpers.hasPermission(req.user, required);
      break;
    }
    case 'roles': {
      req.authorized = helpers.hasRole(req.user, required);
      break;
    }
  }

  if (!req.authorized) {
    // TODO: inject any exceptions to these requirements
  }

  if (!req.authorized) {
    return Authenticate.unauthorized(req, res);
  }

  next();
}

Authenticate.unauthorized = function(req, res) {
  if (helpers.config.env === 'development') {
    // TODO: auditing
    console.log(chalk.red.bold(util.format("Unauthorized access attempted by id %s", req.user.id)));
  }

  if (req.isAjax) {
    return res.sendNotAuthorized('Not Authorized', 'You have insufficient permissions to perform this action', null);
  }

  // TODO: change redirect location to suit project
  return res.redirect('/');
}

/* use as route middleware
 * e.g.
 *
 *    router.get('/protected/stuff',
 *               authenticate.permissions(Permissions.permission, Permission.anotherPermission),
 *               authenticate.roles(Role.something, Role.somethingElse),
 *               (req, res, next) => {...} */

Authenticate.permissions = function() {
  var required = Array.prototype.slice.call(arguments, 0);

  return function(req, res, next) {
    Authenticate.isAuthorized('permissions', required, req, res, next);
  }
}

Authenticate.roles = function() {
  var required = Array.prototype.slice.call(arguments, 0);

  return function(req, res, next) {
    Authenticate.isAuthorized('roles', required, req, res, next);
  }
}

module.exports = Authenticate;