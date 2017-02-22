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

var pickBy = require('lodash.pickby');
var has = require('lodash.has');
var isEmpty = require('lodash.isempty');
var transform = require('lodash.transform');
var is = require('is');
var extend = require('extend');
var isNull = is.null;
var isString = is.string;
var isObject = is.object;
var isNumber = is.number;

function ListErrorOptions () {
  this.groupId = null;
  this.serviceFilter = null;
  this.timeRange = null;
  this.pageSize = 10;
  this.pageToken = null;
}

ListErrorOptions.validateQueryObjectsForExport = function (v) {
  return isObject(v) && !isEmpty(v);
}


ListErrorOptions.prefixQueryObjectForExport = function (prefix, trgObject) {
  // Since querystring does not walk object paths for stringification
  // manually extract all serviceFilter child properties and place them
  // on the object top-level with a 'serviceFilter.' prefix for the
  // error reporting service.
  return transform(trgObject, function (acc, v, key) {
    acc[[prefix, key].join('.')] = v;
  }, {});
};

ListErrorOptions.exportFilter = function () {
  return {
    groupId: isString,
    serviceFilter: ListErrorOptions.validateQueryObjectsForExport,
    timeRange: ListErrorOptions.validateQueryObjectsForExport,
    pageSize: isNumber,
    pageToken: isString
  }
};

ListErrorOptions.exportTransformer = function () {
  return {
    serviceFilter: function (serviceFilterObject) {
      return ListErrorOptions
        .prefixQueryObjectForExport('serviceFilter', serviceFilterObject);
    },
    timeRange: function (timeRangeObject) {
      return ListErrorOptions
        .prefixQueryObjectForExport('timeRange', timeRangeObject);
    }
  };
};

ListErrorOptions.timePeriods = function () {
  return {
    PERIOD_ONE_HOUR: 'PERIOD_ONE_HOUR',
    PERIOD_SIX_HOURS: 'PERIOD_SIX_HOURS',
    PERIOD_ONE_DAY: 'PERIOD_ONE_DAY',
    PERIOD_ONE_WEEK: 'PERIOD_ONE_WEEK',
    PERIOD_30_DAYS: 'PERIOD_30_DAYS'
  };
};

ListErrorOptions.prototype.setGroupId = function (groupId) {
  this.groupId = groupId;
  return this;
};

ListErrorOptions.prototype.setServiceFilter = function (service, version, resourceType) {
  this.serviceFilter = pickBy({
    service: service,
    version: version,
    resourceType: resourceType
  }, function (v) {
    return isString(v);
  });
  return this;
};

ListErrorOptions.prototype.setTimeRange = function (timeRange) {
  this.timeRange = {period: ListErrorOptions.timePeriods()[timeRange]};
  return this;
};

ListErrorOptions.prototype.setPageSize = function (pageSize) {
  this.pageSize = pageSize;
  return this;
};

ListErrorOptions.prototype.setPageToken = function (pageToken) {
  this.pageToken = pageToken;
  return this;
};

ListErrorOptions.prototype.exportAsRequestOptions = function () {
  return transform(
    pickBy(this, function (v, key) {
      if (has(ListErrorOptions.exportFilter(), key)) {
        return ListErrorOptions.exportFilter()[key](v);
      }
      return false;
    }),
    function (acc, v, key) {
      if (has(ListErrorOptions.exportTransformer(), key)) {
        extend(acc, ListErrorOptions.exportTransformer()[key](v));
      } else {
        acc[key] = v;
      }
    },
    {}
  );
};

module.exports = ListErrorOptions;
