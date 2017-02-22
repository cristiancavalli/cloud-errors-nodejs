/**
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';
var commonDiag = require('@google/cloud-diagnostics-common');
var querystring = require('querystring');
var logger = require('../logger.js');
var errors = require('./errors.js');
var noOp = require('lodash.noop');
var is = require('is');
var isFunction = is.fn;
var isString = is.string;
var isEmpty = require('lodash.isempty');
var extend = require('extend');

/* @const {Array<String>} list of scopes needed to work with the errors api. */
var SCOPES = ['https://www.googleapis.com/auth/cloud-platform'];

/* @const {String} Base Error Reporting API */
var API = 'https://clouderrorreporting.googleapis.com/v1beta1/projects';

var API_ENDPOINTS = {
  report: 'events:report',
  deleteAllEvents: 'events',
  listEvents: 'events'
}

/**
 * The RequestHandler constructor initializes several properties on the
 * RequestHandler instance and create a new request factory for requesting
 * against the Error Reporting API.
 * @param {Configuration} config - The configuration instance
 * @param {Object} logger - the logger instance
 * @class RequestHandler
 * @classdesc The RequestHandler class provides a centralized way of managing a
 * pool of ongoing requests and routing there callback execution to the right
 * handlers. The RequestHandler relies on the diag-common request factory
 * and therefore only manages the routing of execution to the proper callback
 * and does not do any queueing/batching. The RequestHandler instance has
 * several properties: the projectId property is used to create a correct url
 * for interacting with the API and key property can be optionally provided a
 * value which can be used in place of default application authentication. The
 * shouldReportErrors property will dictate whether or not the handler instance
 * will attempt to send payloads to the API. If it is false the handler will
 * immediately call back to the completion callback with a constant error value.
 * @property {Function} _request - a npm.im/request style request function that
 *  provides the transport layer for requesting against the Error Reporting API.
 *  It includes retry and authorization logic.
 * @property {String} _projectId - the project id used to uniquely identify and
 *  address the correct project in the Error Reporting API
 * @property {Object} _logger - the instance-cached logger instance
 */
function RequestHandler(config, logger) {
  this._request = commonDiag.utils.authorizedRequestFactory(SCOPES, {
    keyFile: config.getKeyFilename(),
    credentials: config.getCredentials()
  });
  this._config = config;
  this._logger = logger;
}

/**
 * Manufacture a valid Errors service href given a valid projectId and endpoint
 * are given as parameters. Query is an optional object argument which, if given
 * will be converted to a query-string and appended to the returned href.
 * @param {String} projectId - the project id of the application.
 * @param {API_ENDPOINTS} endpoint - one of the API_ENDPOINTS constituent
 *  strings.
 * @param {Object} [query] - an optional single-topology object which will be
 *  converted to a query string and appended to the returned url if given.
 * @returns {String} A Errors Service HREF
 * @private
 */
function manufactureAPIHref (projectId, endpoint, query) {
  return ([API, projectId, endpoint].join('/')) +
    (isEmpty(query) ? '' : '?' + querystring.stringify(query));
  // + 
  //   isEmpty(query) ? '' : '?' + querystring.stringify(query);
}

RequestHandler.prototype.requestPreflight = function (userCb, readyCb) {
  var self = this;
  var validatedCb = isFunction(userCb) ? userCb : noOp;
  var e;
  if (!self._config.getShouldReportErrorsToAPI()) {
    e = new errors.ClientNotConfiguredToSendErrors();
    self._logger.error(e.message);
    return readyCb(validatedCb, e, null);
  }
  self._config.getProjectId(function (err, id) {
    if (err) {
      e = new errors.UnableToRetrieveProjectId(err.message);
      self._logger.error(e.message);
      return readyCb(validatedCb, e, null);
    }
    return readyCb(validatedCb, null, id);
  });
};

RequestHandler.prototype.getAPIKeyOptions = function () {
  if (this._config.getKey()) {
    return {key: this._config.getKey()};
  }
  return {};
}

/**
 * Creates a request options object given the value of the error message and
 * will callback to the user supplied callback if given one. If a callback is
 * not given then the request will execute and silently dissipate.
 * @function sendError
 * @param {ErrorMessage} payload - the ErrorMessage instance to JSON.stringify
 *  for submission to the service
 * @param {RequestHandler~requestCallback} [userCb] - function called when the
 *  request has succeeded or failed.
 * @returns {Undefined} - does not return anything
 */
RequestHandler.prototype.sendError = function(errorMessage, userCb) {
  var self = this;
  this.requestPreflight(userCb, function (cb, err, id) {
    if (err) {
      return cb(err, null, null);
    }
    var opts = self.getAPIKeyOptions();
    self._request({
      uri: manufactureAPIHref(id, API_ENDPOINTS.report, opts),
      method: 'POST',
      json: errorMessage
    }, function (err, response, body) {
      if (err) {
        self._logger.error(
          new errors
            .BadAPIInteraction('write an error to the API', err.message));
      }
      cb(err, response, body);
    });
  });
};

RequestHandler.prototype.deleteAllErrors = function (userCb) {
  var self = this;
  this.requestPreflight(userCb, function (cb, err, id) {
    if (err) {
      return cb(err, null, null);
    }
    var opts = self.getAPIKeyOptions();
    self._request({
      uri: manufactureAPIHref(id, API_ENDPOINTS.deleteAllEvents, opts),
      method: 'DELETE'
    }, function (err, response, body) {
      if (err) {
        self._logger.error(
          new errors.BadAPIInteraction('delete all errors from project: '+id,
              err.message));
      }
      cb(err, response, body);
    });
  });
};

RequestHandler.prototype.listErrors = function (listErrorOptions, userCb) {
  var self = this;
  this.requestPreflight(userCb, function (cb, err, id) {
    var opts = extend(self.getAPIKeyOptions(), listErrorOptions
      .exportAsRequestOptions());
    // console.log('---');
    // console.log('HERE IS THE LIST URL:')
    // console.log('  '+manufactureAPIHref(id, API_ENDPOINTS.listEvents, opts));
    // console.log('---');
    self._request({
      uri: manufactureAPIHref(id, API_ENDPOINTS.listEvents, opts),
      method: 'GET'
    }, function (err, response, body) {
      if (err) {
        self._logger.error(
          new errors.BadAPIInteraction('list errors from project '+id,
            err.message));
      }
      cb(err, response, body);
    });
  });
}
/**
 * The requestCallback callback function is called on completion of an API
 * request whether that completion is success or failure. The request can either
 * fail by reaching the max number of retries or encountering an unrecoverable
 * response from the API. The first parameter to any invocation of the
 * requestCallback function type will be the applicable error if one was
 * generated during the request-response transaction. If an error was not
 * generated during the transaction then the first parameter will be of type
 * Null. The second parameter is the entire response from the transaction, this
 * is an object that as well as containing the body of the response from the
 * transaction will also include transaction information. The third parameter is
 * the body of the response, this can be an object, a string or any type given
 * by the response object.
 * @callback RequestHandler~requestCallback cb - The function that will be
 *  invoked once the transaction has completed
 * @param {Error|Null} err - The error, if applicable, generated during the
 *  transaction
 * @param {Object|Undefined|Null} response - The response, if applicable, received
 *  during the transaction
 * @param {Any} body - The response body if applicable
 */

module.exports = RequestHandler;
