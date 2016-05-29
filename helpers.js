var crypto = require('crypto');
var moment = require('moment');
var chalk = require('chalk');
var util = require('util');
var fs = require('fs');
var config = require('../config');

var helpers = () => {}

helpers.logMessage = (severity, message) => {

  //todo: this needs to be a component that can log to multiple locations - db, log, webhook, etc.
  var datetime = helpers.now();
  var location = new Error('').stack.split('\n').splice(3, 1)[0];
  location = location.substring(location.indexOf('/'));

  var entry = {
    datetime: datetime,
    severity: severity,
    location: location,
    message: message
  }

  entry = JSON.stringify(entry) + '\n';

  fs.appendFile(__dirname + '/../app.log', entry, function(error) {
    if (error) {
      console.log(chalk.red(JSON.stringify(error)));
    }

    if (severity == "ERROR") {
      console.log(chalk.red.bold('Error logged'));
    }
  })
}

helpers.config = config;

helpers.isType = (value, type) => {
  return Object.prototype.toString.call(value) === Object.prototype.toString.call(type);
}

helpers.hash = (value, algorithm) => {
  var value = value || (moment().utc().valueOf().toString() + Math.random().toString());
  var algorithm = algorithm || 'sha512';
  return crypto.createHash(algorithm).update(config.hashPrefix + value + config.hashSuffix).digest('hex');
}

helpers.formatDateTime = (value, outFormat, inFormat) => {
  var result = '';

  if (!value || !outFormat) {
    return value;
  }

  if (inFormat) {
    result = moment(new Date(value), inFormat).format(outFormat);
  }
  else {
    result = moment(new Date(value)).format(outFormat);
  }

  return result.toLowerCase() == "invalid date" ? value : result;
}

helpers.fromJson = (obj, json) => {
  for (var prop in json) {

    var casedProp = prop.toCamelCase();

    if (obj.hasOwnProperty(casedProp) && typeof obj[prop] !== 'function') {

      var value = json[prop];

      if (helpers.isType(value, new Date())) {
        value = helpers.formatDateTime(new Date(value), "YYYY-MM-DD HH:mm:ss");
      }

      obj[casedProp] = value;
    }
  }
}

helpers.now = () => {
  return moment().format("YYYY-MM-DD HH:mm:ss");
}

helpers.responses = (res) => {

  // attach the response types to res.send
  res.send.success = function(message, data) {
    result(200, message, data);
  };

  res.send.unauthorized = function(message, data) {
    result(401, message, data);
  };

  res.send.missing = function(message, data) {
    result(404, message, data);
  };

  res.send.invalid = function(message, data) {
    result(422, message, data);
  };

  res.send.error = function(message, data) {
    result(500, message, data);
  }

  function result(status, message, data) {
    var returnData = {
      success: true,
      message: message,
      data: data
    }

    if (status != 200) {
      returnData.success = false;
    }

    res.status(status);
    res.send(returnData);
  }
}

helpers.log = {
  info: function(message) {
    helpers.logMessage("INFO", message);
  },
  warn: function(message) {
    helpers.logMessage("WARNING", message);
  },
  error: function(message) {
    var error = message;

    if (helpers.isType(message, new Error()) || helpers.isType(message, new Object())) {
      error = message.message || 'unspecified error';

      if (message.stack) {
        error += ' [stack] ' + message.stack;
      }
    }

    helpers.logMessage("ERROR", message);
  },
  debug: function(message) {
    if (helpers.config.env == 'dev') {
      helpers.logMessage("DEBUG", message);
    }
  }
}

helpers.authorized = (granted, required, all) => {
  var isAuthroized = false;

  if (helpers.isType(granted, new Object())) {
    granted = [granted];
  }

  if (helpers.isType(required, new Object())) {
    required = [required];
  }

  for (var requiredIdx = 0; requiredIdx < required.length; requiredIdx++) {
    for (var grantedIdx = 0; grantedIdx < granted.length; grantedIdx++) {
      isAuthroized = (granted[grantedIdx].code == required[requiredIdx].code);

      if (isAuthroized) {
        break;
      }
    }

    if ((isAuthroized && !all) || (!isAuthroized && all)) {
      break;
    }
  }

  return isAuthroized;
}

helpers.hasRoles = (user, roles) => {
  return helpers.authorized(user.roles, roles, false);
}

helpers.hasPermissions = (user, permissions) => {
  return helpers.authorized(user.permissions, permissions, true);
}

module.exports = helpers;
