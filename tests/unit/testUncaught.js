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

var test = require('tape');
var isFunction = require('lodash').isFunction;
var uncaughtSetup = require('../../lib/interfaces/uncaught.js');
var Configuration = require('../../lib/configuration.js');
var ErrorMessage = require('../../lib/classes/error-message.js');
var originalHandlers = process.listeners('uncaughtException');
var fork = require('child_process').fork;

function reattachOriginalListeners ( ) {
  for (var i = 0; i < originalHandlers.length; i++) {
    process.on('uncaughtException', originalHandlers[i]);
  }
}

test('Uncaught handler setup', function (t) {
  t.throws(uncaughtSetup, undefined, 'Should throw given no configuration');
  t.doesNotThrow(uncaughtSetup.bind(null, {}, {reportUncaughtExceptions: true}), undefined,
    'Should not throw given valid configuration');
  t.doesNotThrow(uncaughtSetup.bind(null, {}, {reportUncaughtExceptions: false}), undefined,
    'Should not throw given valid configuration');
  t.assert(process === uncaughtSetup({}, {}),
    'Should the process on successful initialization');
  process.removeAllListeners('uncaughtException');
  t.deepEqual(process.listeners('uncaughtException').length, 0,
    'There should be no listeners');
  uncaughtSetup({}, {reportUncaughtExceptions: false});
  t.deepEqual(process.listeners('uncaughtException').length, 0,
    'There should be no listeners if reportUncaughtExceptions is false');
  uncaughtSetup({}, {reportUncaughtExceptions: true});
  t.deepEqual(process.listeners('uncaughtException').length, 1,
    'There should be one listener if reportUncaughtExceptions is true');
  process.removeAllListeners('uncaughtException');
  t.end();
});

test('Test uncaught shutdown behavior', function (t) {
  var isolate = fork('./tests/fixtures/uncaughtExitBehaviour.js', null, process.env);
  var timeout = setTimeout(function () {
    t.fail('Should terminate before 2500ms');
    reattachOriginalListeners();
    t.end();
  }, 2500);
  isolate.on('close', function () {
    t.pass('Should terminate before 2500ms');
    clearTimeout(timeout);
    reattachOriginalListeners();
    t.end();
  });
  isolate.on('error', function () {
    console.log('got error:\n', arguments);
    t.fail('Got an error in isolate');
    reattachOriginalListeners();
    t.end();
  });
});
