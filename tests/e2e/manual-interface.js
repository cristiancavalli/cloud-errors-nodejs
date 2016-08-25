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
var lodash = require('lodash');
var isObject = lodash.isObject;
var isEmpty = lodash.isEmpty;
var test = require('tape');
var errors = require('../../index.js').start();
var errorId = [Date.now(), 'manual-interface-e2e-fixture'].join('_');
var Configuration = require('../../lib/configuration.js');
var Transport = require('../../utils/errors-api-transport.js');

test('End-to-end test of manual interface', function (t) {
  var config = new Configuration();
  var transport = new Transport(config);
  t.comment('Wiping error log..');
  transport.deleteAllEvents(function (err) {
    if (err) {
      t.fail('Could not delete errors for test');
      console.log(err);
      t.end();
      return;
    }
    setTimeout(function() {
      t.comment('Completed deleting error log, checking for wipe');
      transport.getAllGroups(function (err, groups) {
        if (err) {
          t.fail('Could not get the groups for test');
          console.log(err);
          t.end();
          return;
        }
        t.assert(isEmpty(groups), 'Groups should be an empty object');
        // Even though we can't see message contents right now still provide
        // a somewhat unique id for later querying for a later potentiality
        var e = new Error(errorId);
        t.comment('Transmitting new test error..');
        errors.report(e, function (err, response, body) {
          t.comment('Finished transmission');
          t.assert(!err, 'Error should be falsy');
          t.assert(isObject(response), 'Response should be an object');
          t.deepEqual(body, {}, 'Body should be an empty object');
          t.comment('Now checking for new group..');
          setTimeout(function () {
            transport.getAllGroups(function (err, groups) {
              t.comment('Finsihed fetching groups');
              if (err) {
                t.fail('Could not get the groups for test');
                console.log(err);
                t.end();
                return;
              }
              t.assert(!isEmpty(groups), 'Groups should not be empty');
              t.end();
            });
          }, 1200);
        });
      });
    }, 1200);
  });
});
