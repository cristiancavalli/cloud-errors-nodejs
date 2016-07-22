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
var test = require('tape');
var Configuration = require('../../lib/configuration_new.js');
var version = require('../../package.json').version;
var Fuzzer = require('../../utils/fuzzer.js');

test(
  'Initing an instance of Configuration should return a Configuration instance',
  function (t) {
    var c;
    var f = new Fuzzer();
    var stubConfig = {test: true};
    t.deepEqual(typeof Configuration, 'function');
    t.doesNotThrow(function () { 
      c = new Configuration(stubConfig); 
    });
    t.deepEqual(c._initState, false, "The _initState should be false");
    t.deepEqual(c._givenConfiguration, stubConfig, 
      "Given a valid configuration the instance should assign it as the value "+
      "to the _givenConfiguration property"
    );
    f.fuzzFunctionForTypes(
      function (givenConfigFuzz) {
        c = new Configuration(givenConfigFuzz);
        t.deepEqual(c._givenConfiguration, null, 
          "The _givenConfiguration property should remain null if given "+
          "invalid input"
        );
      },
      ["object"]
    );
    t.end();
  }
);