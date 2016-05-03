
/*  usage
 *
 *  var namedParams = require('pg-named-params');
 *
 *  sql.connect(dbConfig, function(err, client, done) {
        ...

        namedParams.patch(client);
  */

// TODO: adapt to sql server in addition to postgres
var util = require('util');
var helpers = require('./helpers');

function interpolate(sql, params) {
  var parameters = Object.keys(params);
  var uniqueParams = [];
  var values = [];

  for (var idx = 0; idx < parameters.length; idx++) {

    var found = false;

    for (var iidx = 0; iidx < uniqueParams.length; iidx++) {
      if (uniqueParams[iidx] == parameters[idx]) {
        found = true;
      }
    }

    if (!found) {
      uniqueParams.push(parameters[idx]);
      values.push(params[parameters[idx]]);
    }
  }

  var interpolated = sql;

  // replace named params with indices
  var matched = sql.match(/(:|\$)[a-zA-Z]([a-zA-Z0-9_]*)\b/g);

  if (matched != null) {
    for (var idx = 0; idx < matched.length; idx++) {
      var match = matched[idx].replace(/(:|\$)/, '');
      var iidx = 0;

      // get the matching index from unique params
      for (var iidx; iidx < uniqueParams.length; iidx++) {
        if (match == uniqueParams[iidx]) {
          break;
        }
      }

      interpolated = interpolated.replace(matched[idx], util.format("$%s", iidx + 1));
    }
  }

  return {
    sql: interpolated,
    values: values
  };
}

function patch(client) {
  var namedQuery = client.query;

  if (namedQuery.patched) {
    return client;
  }

  namedQuery = namedQuery.bind(client);

  client.query = (config, values, callback) => {

    // replace the provided config with the interpolated
    if (helpers.isType(config, new Object()) && helpers.isType(config.values, new Object())) {
      var result = interpolate(config.text, config.values);
      config.text = result.interpolatedSql.sql;
      config.values = result.interpolatedSql.values;
    }

    if (arguments.length === 1) {
      return namedQuery(config);
    }
    else if (arguments.length === 2 && helpers.isType(values, new Function())) {
      return namedQuery(config, values);
    }
    else if (!values || helpers.isType(values, new Array())) {
      return namedQuery(config, values, callback);
    }
    else {
      var result = interpolate(config, values);
      return namedQuery(result.interpolatedSql.sql, result.interpolatedSql.values, callback);
    }
  };

  client.query.patched = true;
  return client;
}

module.exports.patch = patch;