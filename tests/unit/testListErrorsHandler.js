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

var assert = require('assert');
var merge = require('lodash.merge');
var listErrors = require('../../src/interfaces/listErrors.js');
var Configuration = require('../fixtures/configuration.js');
var ListErrorOptions = require('../../src/classes/list-error-options.js');
var nock = require('nock');
var STUB_GROUP_ID = 'xyz';

describe('Manual handler', function () {
  var client, cfg, list;
  before(function () {
    nock.disableNetConnect();
    client = {
      listErrors: function (opts, cb) {
        if (cb) {
          setImmediate(function () {
            cb(null, null);
          });
        }
      }
    };
  });
  beforeEach(function () {
    cfg = new Configuration({});
    cfg.lacksCredentials = function () {
      return false;
    };
    list = listErrors(client, cfg); 
  });
  after(function () {
    nock.enableNetConnect();
  });
  describe('Lacking credentials', function () {
    var c = new Configuration({});
    c.lacksCredentials = function () {
      return true;
    }
    var badList = listErrors(client, c);
    var err = badList(STUB_GROUP_ID);
    assert(err instanceof Error);
  });
  describe('List errors invocation behaviour', function () {
    it('Should error without valid group id string or options object with group id property',
      function (done) {
        var r = list(null, function (e, resp) {
          assert(e instanceof Error);
          assert.strictEqual(resp, null);
          done();
        });
      }
    );
    it('Should error without valid group id string or options object and return the error',
      function () {
        assert(list(null) instanceof Error);
      }
    );
    describe('Options submission', function () {
      function newOptions (opts) {
        return merge({groupId: STUB_GROUP_ID}, opts ? opts : {});
      }
      describe('Group id', function () {
        it('Should allow a single string as the required argument for groupId', function () {
          var r = list(STUB_GROUP_ID, function (e, resp) {
            assert.strictEqual(e, null);
            assert.strictEqual(resp, null);
          });
          assert(r.groupId, STUB_GROUP_ID);
        });
        it('Should allow an object with a group id property as the argument for groupId', function () {
          var l = list(newOptions());
          assert(l.groupId, STUB_GROUP_ID);
        });
      });
      describe('Service filter', function () {
        it('Should err if not an object', function (done) {
          list(newOptions({serviceFilter: true}), function (e, resp) {
            assert(e instanceof Error);
            assert.strictEqual(resp, null);
            done();
          });
        });
        it('Should accept an empty object', function () {
          var l = list(newOptions({serviceFilter: {}}));
          assert.deepEqual(l.serviceFilter, {});
        });
        it('Should err if filter.service is set and not string', function (done) {
          var l = list(newOptions({serviceFilter: {service: true}}), function (e, resp) {
            assert(e instanceof Error);
            done();
          });
        });
        it('Should err if filter.version is set and not string', function (done) {
          var l = list(newOptions({serviceFilter: {version: true}}), function (e, resp) {
            assert(e instanceof Error);
            done();
          });
        });
        it('Should err if filter.resourceType is set and not string', function (done) {
          var l = list(newOptions({serviceFilter: {resourceType: false}}), function (e, resp) {
            assert(e instanceof Error);
            done();
          });
        });
        it('Should accept valid filter.service', function () {
          var l = list(newOptions({serviceFilter: {service: 'test'}}));
          assert.strictEqual(l.serviceFilter.service, 'test');
        });
        it('Should accept valid filter.version', function () {
          var l = list(newOptions({serviceFilter: {version: 'test'}}));
          assert.strictEqual(l.serviceFilter.version, 'test');
        });
        it('Should accept valid filter.resourceType', function () {
          var l = list(newOptions({serviceFilter: {resourceType: 'test'}}));
          assert.strictEqual(l.serviceFilter.resourceType, 'test');
        });
      });
      describe('Time range', function () {
        it('Should err if timeRange is set and not a string', function (done) {
          var l = list(newOptions({timeRange: true}), function (e, resp) {
            assert(e instanceof Error);
            done();
          });
        });
        it('Should err if timeRange is not a constituent of accepted enumeration', function (done) {
          var l = list(newOptions({timeRange: 'xyz'}), function (e, resp) {
            assert(e instanceof Error);
            done();
          });
        });
        it('Should accept a valid timeRange', function () {
          var l = list(newOptions({timeRange: ListErrorOptions.timePeriods().PERIOD_ONE_HOUR}));
          assert.deepEqual(l.timeRange, {period: ListErrorOptions.timePeriods().PERIOD_ONE_HOUR});
        });
      });
      describe('Page size', function () {
        it('Should err if set and not a string', function (done) {
          list(newOptions({pageSize: '1'}), function (e, resp) {
            assert(e instanceof Error);
            done();
          });
        });
        it('Should accept a valid pageSize', function () {
          var l = list(newOptions({pageSize: 1}));
          assert.strictEqual(l.pageSize, 1);
        });
      });
      describe('Page token', function () {
        it('Should err if set and not a string', function (done) {
          list(newOptions({pageToken: 123}), function (e, resp) {
            assert(e instanceof Error);
            done();
          });
        });
        it('Should accept a valid page token', function () {
          var l = list(newOptions({pageToken: 'abc'}));
          assert.strictEqual(l.pageToken, 'abc');
        });
      });
    });
  });
});
