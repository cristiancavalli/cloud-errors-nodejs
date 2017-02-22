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
const assert = require('assert');
const GROUP_ID = process.env.ERRORS_STUBBED_GROUP_ID;
const PROJECT = process.env.GCLOUD_PROJECT;
const CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const is = require('is');
const has = require('lodash.has');
const errors = require('../../index.js')({ignoreEnvironmentCheck: true});

describe('e2e test - get error', function () {
  before(function () {
    switch (true) {
      case is.empty(GROUP_ID):
        console.error(
          'The target groupId (ERRORS_STUBBED_GROUP_ID) was not set as an env variable');
        return this.skip();
      case is.empty(PROJECT):
        console.error(
          'The target groupId (ERRORS_STUBBED_GROUP_ID) was not set as an env variable');
        return this.skip();
      case is.empty(CREDENTIALS):
        console.error(
          'The project credentials (GOOGLE_APPLICATION_CREDENTIALS) was not set as an env variable');
        return this.skip();
    }
  });
  it('Should be able to query the service for error events', function (done) {
    this.timeout(15000);
    const TIME_PERIOD = errors.eventQuery.timePeriods().PERIOD_30_DAYS;
    console.log('Querying the Stackdriver Errors Service...');
    errors.getErrors(
      errors.eventQuery().setGroupId(GROUP_ID).setTimeRange(TIME_PERIOD), 
      function (err, response, body) {
        assert.strictEqual(err, null, 'Error should be null');
        assert(is.object(body), 'The response body should be an object');
        if (!has(body, 'errorEvents')) {
          console.log([
            'The service returned a 200-OK and all current tests pass but the',
            'response body did not contain any error events. This may be',
            'because the given groupId: '+GROUP_ID+' was not found in given',
            'time range of '+TIME_PERIOD+'.'
          ].join('\n'));
        } else {
          assert(is.array(body.errorEvents));
        }
        done();
      }
    );
  });
});
