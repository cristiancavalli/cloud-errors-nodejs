/**
 * Copyright 2017 Google Inc. All Rights Reserved.
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

var has = require('lodash.has');
var every = require('lodash.every');
var pick = require('lodash.pick');
var is = require('is');
var isString = is.string;
var isNumber = is.number;
var isFunction = is.fn;
var isObject = is.object;
var ListErrorOptions = require('../classes/list-error-options.js');

function populateRequestOptions (userOptions) {
  var opts = new ListErrorOptions();
  // Attempt to extract groupId [REQUIRED ARGUMENT]
  if (isString(userOptions)) {
    // User has only supplied group id, return options with only that field set
    // since all other fields are optional.
    return opts.setGroupId(userOptions);
  } else if (userOptions instanceof ListErrorOptions) {
    // User has utilized the builder pattern, return the builder instance.
    return userOptions;
  } else if (!isObject(userOptions) || !isString(userOptions.groupId)) {
    return new Error(
      'Must provide a groupId in either the form of a string or an object ' +
      'with a groupId property that is a string.');
  } else {
    opts.setGroupId(userOptions.groupId);
  }
  // Attempt to extract serviceFilter [OPTIONAL ARGUMENT]
  if (!has(userOptions, 'serviceFilter')) {
    // PASS; omit setting serviceFilter
  } else if (!isObject(userOptions.serviceFilter)) {
    return new Error(
      'Optional argument property serviceFilter must be of type object if supplied');
  } else if (has(userOptions.serviceFilter, 'service') && !isString(userOptions.serviceFilter.service)) {
    return new Error(
      'Optional argument serviceFilter.service must be of type string if supplied');
  } else if (has(userOptions.serviceFilter, 'version') && !isString(userOptions.serviceFilter.version)) {
    return new Error(
      'Optional argument serviceFilter.version must be of type string if supplied');
  } else if (has(userOptions.serviceFilter, 'resourceType') && !isString(userOptions.serviceFilter.resourceType)) {
    return new Error(
      'Optional argument serviceFilter.resourceType must of type string if supplied');
  } else {
    opts.setServiceFilter(userOptions.serviceFilter.service, 
      userOptions.serviceFilter.version, userOptions.serviceFilter.resourceType);
  }
  // Attempt to extract timeRange [OPTIONAL ARGUMENT]
  if (!has(userOptions, 'timeRange')) {
    // PASS; omit setting timeRange
  } else if (!isString(userOptions.timeRange) || !has(ListErrorOptions.timePeriods(), userOptions.timeRange)) {
    return new Error(
      'Optional argument serviceFilter.timeRange must one of the following ' +
      'if supplied: \n' + Object.keys(ListErrorOptions.timePeriods()).join(', ')
    );
  } else {
    opts.setTimeRange(userOptions.timeRange);
  }
  // Attempt to extract pageSize [OPTIONAL ARGUMENT]
  if (!has(userOptions, 'pageSize')) {
    // PASS; omit setting pageSize
  } else if (!isNumber(userOptions.pageSize)) {
    return new Error('Optional argument pageSize must of type number if supplied');
  } else {
    opts.setPageSize(userOptions.pageSize);
  }
  // Attempt to extract pageToken (for paginated responses) [OPTIONAL ARGUMENT]
  if (!has(userOptions, 'pageToken')) {
    // PASS; omit setting pageToken
  } else if (!isString(userOptions.pageToken)) {
    return new Error('Optional argument pageToken must be of type string if supplied');
  } else {
    opts.setPageToken(userOptions.pageToken);
  }

  return opts;
}

function handlerSetup (client, config) {
  function listErrors (userOptions, callback) {
    var requestOptions;
    if (config.lacksCredentials()) {
      return new Error('Valid credentials have not been supplied');
    }
    requestOptions = populateRequestOptions(userOptions);
    if (requestOptions instanceof Error) {
      if (isFunction(callback)) {
        callback(requestOptions, null);
      }
      return requestOptions;
    }
    client.listErrors(requestOptions, callback);
    return requestOptions;
  }
  // Expose the immutable timePeriods enum function via the query interface
  return listErrors;
}

module.exports = handlerSetup;
