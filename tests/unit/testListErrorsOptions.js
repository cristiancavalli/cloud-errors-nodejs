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

const assert = require('assert');
const has = require('lodash.has');
const omit = require('lodash.omit');
const ListErrorOptions = require('../../src/classes/list-error-options.js');

describe('ListErrorOptions', function () {
  describe('Class Statics', function () {
    describe('validateQueryObjectsForExport', function () {
      const fn = ListErrorOptions.validateQueryObjectsForExport;
      it('Should return false if not an object',
        () => assert.strictEqual(fn('test'), false));
      it('Should return false if empty object',
        () => assert.strictEqual(fn({}), false));
      it('Should return true on an object with at least one property',
        () => assert.strictEqual(fn({test: true}), true));
    });
    describe('prefixQueryObjectForExport', function () {
      const fn = ListErrorOptions.prefixQueryObjectForExport;
      const PREFIX = 'unitTest';
      const INPUT = {key: true};
      const OUTPUT = {[[PREFIX, 'key'].join('.')]: true};
      it('Should prefix each key with a given value delimited by a `.`',
        () => assert.deepEqual(fn(PREFIX, INPUT), OUTPUT));
    })
  });
  describe('Self-modifying instance methods', function () {
    var inst;
    beforeEach(() => inst = new ListErrorOptions());
    describe('setGroupId', function () {
      const INPUT = 'xyz';
      it('Should set the given value on the groupId property',
        () => assert.strictEqual(inst.setGroupId(INPUT).groupId, INPUT));
    });
    describe('setServiceFilter', function () {
      const INPUT = {
        service: 'abc',
        version: '1.2.3',
        resourceType: 'node'
      };
      it('Should set an empty object if no properties are strings',
        () => assert.deepEqual(
          inst.setServiceFilter(null, {}, 123).serviceFilter, {}));
      it('Should set all valid arguments on the serviceFilter property',
        () => assert.deepEqual(
          inst.setServiceFilter(INPUT.service, INPUT.version, INPUT.resourceType)
            .serviceFilter,
          INPUT));
    });
    describe('setTimeRange', function () {
      const INPUT = ListErrorOptions.timePeriods().PERIOD_ONE_HOUR;
      const OUTPUT = {period: INPUT};
      it('Should set the timeRange property on the instance',
        () => assert.deepEqual(inst.setTimeRange(INPUT).timeRange, OUTPUT));
    });
    describe('setPageSize', function () {
      const INPUT = 50;
      it('Should set the pageSize property on the instance',
        () => assert.deepEqual(inst.setPageSize(INPUT).pageSize, INPUT));
    });
    describe('setPageToken', function () {
      const INPUT = 'abz';
      it('Should set the pageToken property on the instance',
        () => assert.deepEqual(inst.setPageToken(INPUT).pageToken, INPUT));
    });
    describe('exportAsRequestOptions', function () {
      describe('Export Filtering', function () {
        describe('groupId', function () {
          it('Should omit groupId for export if not a string',
            () => assert.strictEqual(
              has(inst.setGroupId(123).exportAsRequestOptions(), 'groupId'),
              false)
          );
          it('Should retain groupId for export if a string',
            () => assert.strictEqual(
              inst.setGroupId('123').exportAsRequestOptions().groupId, '123')
          );
        });
        describe('pageSize', function () {
          it('Should omit pageSize for export if not a number',
            () => assert.strictEqual(
              has(inst.setPageSize('123').exportAsRequestOptions(), 'pageSize'),
              false)
          );
          it('Should retain pageSize for export if a number',
            () => assert.strictEqual(
              inst.setPageSize(123).exportAsRequestOptions().pageSize, 123)
          );
        });
        describe('pageToken', function () {
          it('Should omit pageToken for export if not a string',
            () => assert.strictEqual(
              has(inst.setPageToken(123).exportAsRequestOptions(), 'pageToken'),
              false)
          );
          it('Should retain pageToken for export if a string',
            () => assert.strictEqual(
              inst.setPageToken('123').exportAsRequestOptions().pageToken, '123')
          );
        });
        describe('serviceFilter', function () {
          const VALID = {
            service: 'x',
            version: 'y',
            resourceType: 'z'
          };
          const INVALID = {
            service: null,
            version: 123,
            resourceType: ['test']
          };
          it('Should omit serviceFilter if an empty object',
            () => assert.strictEqual(has(inst.setServiceFilter(
                INVALID.service, INVALID.version, INVALID.resourceType)
                  .exportAsRequestOptions(), 'serviceFilter'),
                false)
          );
          it('Should retain serviceFilter if not an empty object',
            () => assert.deepEqual(omit(inst.setServiceFilter(
                VALID.service, VALID.version, VALID.resourceType)
                  .exportAsRequestOptions(), 'pageSize'),
                ListErrorOptions.prefixQueryObjectForExport('serviceFilter', VALID))
          );
        });
        describe('timeRange', function () {
          const VALID = {period: ListErrorOptions.timePeriods().PERIOD_ONE_HOUR};
          it('Should retain timeRange if not an empty object',
            () => assert.deepEqual(inst.setTimeRange(VALID.period)
              .exportAsRequestOptions()['timeRange.period'], VALID.period));
        });
      });
    });
  });
});
