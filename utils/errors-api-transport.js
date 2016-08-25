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
var util = require('util');
var AuthClient = require('../lib/google-apis/auth-client.js');

/* @const {Array<String>} list of scopes needed to work with the errors api. */
var SCOPES = ['https://www.googleapis.com/auth/cloud-platform'];

/* @const {String} Base Error Reporting API */
var API = 'https://clouderrorreporting.googleapis.com/v1beta1/projects';

var ONE_HOUR_API = 'timeRange.period=PERIOD_1_HOUR';

function ErrorsApiTransport (config) {
  AuthClient.call(this, config);
}

util.inherits(ErrorsApiTransport, AuthClient);

ErrorsApiTransport.prototype.deleteAllEvents = function(cb) {
  var self = this;
  self._config.getProjectId(function (err, id) {
    if (err) {
      cb(err);
    } else {
      self._request({
        url: [API, id, 'events'].join('/'),
        method: 'DELETE'
      }, function (err, response, body) {
        if (err) {
          cb(err);
        } else {
          cb(null);
        }
      });
    }
  });
};

ErrorsApiTransport.prototype.getAllGroups = function(cb) {
  var self = this;
  self._config.getProjectId(function (err, id) {
    if (err) {
      cb(err, null);
    } else {
      self._request({
        url: [API, id, 'groupStats?'+ONE_HOUR_API].join('/'),
        method: 'GET'
      }, function (err, response, body) {
        if (err) {
          cb(err, null);
        } else {
          cb(null, body);
        }
      });
    }
  });
};

module.exports = ErrorsApiTransport;
