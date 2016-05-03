var crypto = require('crypto');
var moment = require('moment');
var chalk = require('chalk');
var util = require('util');
var fs = require('fs');

module.exports = {
  isType: function(value, type) {
    return Object.prototype.toString.call(value) === Object.prototype.toString.call(type);
  },
  hash: function(value, algorithm) {
    var value = value || (moment().utc().valueOf().toString() + Math.random().toString());
    var algorithm = algorithm || 'sha512';
    return crypto.createHash(algorithm).update(config.salt1 + value + config.salt2).digest('hex');
  },
  formatDateTime: function(value, outFormat, inFormat) {
    try {
      var result = '';

      if (inFormat) {
        result = moment(value, inFormat).format(outFormat);
      }
      else if (this.isType(value, new Date()) && outFormat) {
        result = moment(new Date(value)).format(outFormat);
      }
      else if (outFormat) {
        // TODO: moment(value) is deprecated
        result = moment(value).format(outFormat);
      }
      else {
        // no formatting possible
        result = value;
      }

      return result.toLowerCase() == "invalid date" ? value : result;
    }
    catch (e) {
      // TODO: this.log.error(e);
    }
  },
  fromJson: function(json, obj) {
    for (var prop in json) {
      if (obj.hasOwnProperty(prop) && typeof obj[prop] !== 'function') {

        var value = json[prop];

        if (this.isType(value, new Date())) {
          value = this.formatDateTime(new Date(value), "YYYY-MM-DD HH:mm:ss");
        }

        obj[prop] = value;
      }
    }
  },
  now: function() {
    return moment().utc().format("YYYY-MM-DD HH:mm:ss");
  },
  initResponses: function(res) {
    //TODO: this => res.send.success, res.send.unauthorized, res.send.invalid, etc.
    res.sendSuccess = function(message, data) {
      res.sendResult(200, message, data);
    }

    res.sendUnauthorized = function(message, errorMessage, errorDetails) {
      res.sendResult(401, message, {}, errorMessage, errorDetails);
    }

    res.sendNotFound = function(message, data, errorMessage, errorDetails) {
      res.sendResult(404, message, data, errorMessage, errorDetails);
    }

    res.sendInvalid = function(message, data, errorMessage, errorDetails) {
      res.sendResult(422, message, data, errorMessage, errorDetails);
    }

    res.sendError = function(message, data, errorMessage, errorDetails) {
      res.sendResult(500, message, data, errorMessage, errorDetails);
    }

    res.sendResult = function(status, message, data, errorMessage, errorDetails) {
      data.message = message || data.message || '';

      if (status != 200) {
        data.error = {
          message: errorMessage,
          details: errorDetails
        };
      }

      res.status(status);
      res.send(data);
    }
  },
  log: function(severity, entry) {
    //logSeverity: {
    //   UNKNOWN: "UNKNOWN",
    //   INFO: "INFO",
    //   WARN: "WARN",
    //   ERROR: "ERROR",
    //   DEBUG: "DEBUG"
    //},

    //TODO: refactor this => helpers.log.error(message)
    var logEntry = util.format("[%s] [%s] ", this.formatDateTime(new Date(), "YYYY-MM-DD HH:mm:ss"), severity);

    if (severity == this.logSeverity.ERROR) {

      if (this.isType(entry, new String())) {
        logEntry += util.format(" Message: %s\n", entry);
      }
      else if (this.isType(entry, new Error()) || this.isType(entry, new Object())) {
        logEntry += util.format(" Message: %s\n", entry.message);

        if (entry.stack) {
          logEntry += util.format("Stack: %s\n", entry.stack);
        }
      }
    }
    else {
      logEntry += util.format(" Message: %s\n", entry);
    }

    fs.appendFile(__dirname + '/../app.log', logEntry, function(result) {
      if (result) {
        console.log(chalk.red(JSON.stringify(result)));
      }

      if (severity == "ERROR") {
        console.log(chalk.red.bold('Error logged'));
      }
    });
  },
  authorized: function(granted, required, all) {
    var isAuthroized = false;

    for (var requiredIdx = 0; requiredIdx < required.length; requiredIdx++) {
      for (var grantedIdx = 0; grantedIdx < granted.length; grantedIdx++) {
        isAuthroized = (granted[grantedIdx].code == required[requiredIdx].code);

        if (isAuthroized) {
          break;
        }
      }

      if (isAuthroized && !all) {
        break;
      }
      else if (!isAuthroized && all) {
        break;
      }
    }

    return isAuthroized;
  },
  hasRole: function(user, roles) {
    return this.authorized(user.roles, roles, false);
  },
  hasPermission: function(user, permissions) {
    return this.authorized(user.permissions, permissions, true);
  }
}
