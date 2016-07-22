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
var lodash = require('lodash');
var isNumber = lodash.isNumber;
var Configuration = require('../../lib/configuration.js');
var version = require('../../package.json').version;
var Fuzzer = require('../../utils/fuzzer.js');
var cd = require('@google/cloud-diagnostics-common');
var level = process.env.GCLOUD_DEBUG_LOGLEVEL
var logger = cd.logger.create(isNumber(level) ? level : 4);
var nock = require('nock');
var METADATA_URL = 'http://metadata.google.internal/computeMetadata/v1';

test(
  'Initing an instance of Configuration should return a Configuration instance',
  function (t) {
    var c;
    var f = new Fuzzer();
    var stubConfig = {test: true};
    var oldEnv = process.env.NODE_ENV;
    t.deepEqual(typeof Configuration, 'function');
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
    process.env.NODE_ENV = 'development';
    t.doesNotThrow(function () { 
      c = new Configuration(stubConfig); 
    });
    t.deepEqual(c._initState, false, "The _initState should be false");
    t.deepEqual(c._givenConfiguration, stubConfig, 
      "Given a valid configuration the instance should assign it as the value "+
      "to the _givenConfiguration property"
    );
    t.deepEqual(c._initError, null);
    t.deepEqual(c.getError(), null);
    t.deepEqual(c._startedInit, false);
    t.deepEqual(c._reportUncaughtExceptions, true);
    t.deepEqual(c.getReportUncaughtExceptions(), true);
    t.deepEqual(c._shouldReportErrorsToAPI, false, 
      "_shouldReportErrorsToAPI should init to false if env !== production");
    t.deepEqual(c.getShouldReportErrorsToAPI(), false);
    t.deepEqual(c._projectId, null);
    t.deepEqual(c.getProjectId(), null);
    t.deepEqual(c._projectNumber, null);
    t.deepEqual(c.getProjectNumber(), null);
    t.deepEqual(c._key, null);
    t.deepEqual(c.getKey(), null);
    t.deepEqual(c._serviceContext, {service: '', version: ''});
    t.deepEqual(c.getServiceContext(), {service: '', version: ''});
    t.deepEqual(c._version, version);
    t.deepEqual(c.getVersion(), version);
    process.env.NODE_ENV = 'production';
    c = new Configuration();
    t.deepEqual(c._shouldReportErrorsToAPI, true, 
      "_shouldReportErrorsToAPI should init to true if env === production");
    t.deepEqual(c.getShouldReportErrorsToAPI(), true);
    process.env.NODE_ENV = oldEnv;
    t.end();
  }
);

test(
  'Testing state reduction functions on a Configuration instance',
  function (t) {
    var c = new Configuration();
    t.deepEqual(c.isReady(), false,
      "Given a new, uninited instance isReady should return false");
    t.deepEqual(c.hasErrored(), false,
      "Given a new, uninited instance that init has not been invoked on " +
      "hasErrored should return false");
    c._initState = true;
    t.deepEqual(c.isReady(), true,
      "Setting _initState to true on a new instance should cause isReady to " +
      "return true");
    c._initError = new Error();
    t.deepEqual(c.isReady(), false,
      "Setting _initError to an instance of error on an instance that has " +
      "_initState set to true should return false");
    c._initState = false;
    t.deepEqual(c.isReady(), false,
      "Setting _initError to an instance of error on an instance that has " +
      "_initState set to false should return false");
    c = new Configuration();
    c._initError = new Error();
    t.deepEqual(c.hasErrored(), true,
      "Setting _initError to an instance of error should cause hasErrored to " +
      "return true");
    t.end();
  }
);

test(
  'Testing basic init process on a Configuration instance',
  function (t) {
    var oldProject = process.env.GCLOUD_PROJECT;
    delete process.env.GCLOUD_PROJECT;
    var s = nock(
     'http://metadata.google.internal/computeMetadata/v1/project'
    ).get('/numeric-project-id').times(1).reply(500);
    var c = new Configuration().init();
    c.addErrorListener(function (e) {
      t.pass("The Configuration should callback to an error listener if " +
        "inited with an invalid configuration");
      t.assert(e instanceof Error, "The error should be an instance of error");
      process.env.GCLOUD_PROJECT = oldProject;
      s.done();
      t.end();
    })
    c.addReadyListener(function (e) {
      t.fail("Should error");
      process.env.GCLOUD_PROJECT = oldProject;
      s.done();
      t.end();
    })
    t.assert(c === c.init(), "Calling init should return the instance");
  }
);

test(
  'Testing chainable functions for chainability',
  function (t) {
    var c = new Configuration();
    t.deepEqual(c.addReadyListener(), c);
    t.deepEqual(c.addErrorListener(), c);
    t.end();
  }
);

test(
  'Testing logger operations on new instances',
  function (t) {
    var l = {};
    l.warn = function () {
      t.pass("The logger should be invoked");
    };
    var c = new Configuration(null, l);
    console.log("here is c", c.l);
    c.addErrorListener(function(){});
    c._assimilateProjectNumber(new Error());
    t.end();
  }
);

test(
  'Testing ready operations operations on new instances',
  function (t) {
    var projectNumber = '1234';
    var c = new Configuration({projectId: projectNumber});
    var inited = false;
    var s = nock(
     'http://metadata.google.internal/computeMetadata/v1/project'
    ).get('/numeric-project-id').times(1).reply(500);
    c.addReadyListener(function (instance) {
      if (!inited) {
        inited = true;
        t.pass("The ready listener should be called once");
        c.addReadyListener(function () {
          t.pass("The ready listener should still be called when attached late")
        });
        // call init again to test double callback
        c.init();
        s.done();
        t.end();
      } else {
        t.fail("The ready listener should not be called more than once");
      }
    });
    c.addErrorListener(function () {
      t.fail("The error listener shouldn't be called");
    })
    c.init();
  }
);

test(
  'Testing error operations operations on new instances',
  function (t) {
    var oldProject = process.env.GCLOUD_PROJECT;
    delete process.env.GCLOUD_PROJECT;
    var c = new Configuration();
    var inited = false;
    var s = nock(
     'http://metadata.google.internal/computeMetadata/v1/project'
    ).get('/numeric-project-id').times(1).reply(500);
    c.addErrorListener(function (instance) {
      if (!inited) {
        inited = true;
        t.pass("The error listener should be called once");
        c.addErrorListener(function () {
          t.pass("The error listener should still be called when attached late")
        });
        // call init again to test double callback
        c.init();
        s.done();
        process.env.GCLOUD_PROJECT = oldProject;
        t.end();
      } else {
        process.env.GCLOUD_PROJECT = oldProject;
        t.fail("The error listener should not be called more than once");
      }
    });
    c.addReadyListener(function () {
      process.env.GCLOUD_PROJECT = oldProject;
      t.fail("The ready listener shouldn't be called");
    })
    c.init();
  }
);

test(
  'Testing local value assignment in init process on a Configuration instance '+
  'for project number',
  function (t) {
    var oldProject = process.env.GCLOUD_PROJECT;
    delete process.env.GCLOUD_PROJECT;
    var projectNumber = '1234';
    var c = new Configuration({projectId: projectNumber});
    var s = nock(
     'http://metadata.google.internal/computeMetadata/v1/project'
    ).get('/numeric-project-id').times(1).reply(500);
    c.init();
    c.addReadyListener(function (config) {
      t.deepEqual(config.getProjectNumber(), projectNumber);
      t.deepEqual(config.getProjectId(), null, 'project id should remain null');
      process.env.GCLOUD_PROJECT = oldProject;
      s.done();
      t.end();
    });
    c.addErrorListener(function (config) {
      t.fail("Should not callback the error function");
      process.env.GCLOUD_PROJECT = oldProject;
      s.done();
      t.end();
    });
  }
);

test(
  'Testing local value assignment in init process on a Configuration instance '+
  'for project number in env variable',
  function (t) {
    var projectNumber = '1234';
    process.env.GCLOUD_PROJECT = projectNumber;
    var c = new Configuration();
    var s = nock(
     'http://metadata.google.internal/computeMetadata/v1/project'
    ).get('/numeric-project-id').times(1).reply(500);
    c.init();
    c.addReadyListener(function (config) {
      t.deepEqual(config.getProjectNumber(), projectNumber);
      t.deepEqual(config.getProjectId(), null, 'project id should remain null');
      delete process.env.GCLOUD_PROJECT;
      s.done();
      t.end();
    });
    c.addErrorListener(function (config) {
      t.fail("Should not callback the error function");
      delete process.env.GCLOUD_PROJECT;
      s.done();
      t.end();
    });
  }
);


test(
  'Testing local value assignment in init process on a Configuration instance '+
  'for project id',
  function (t) {
    var projectId = 'test-123';
    var c = new Configuration({projectId: projectId});
    var s = nock(
     'http://metadata.google.internal/computeMetadata/v1/project'
    ).get('/numeric-project-id').times(1).reply(500);
    c.init();
    c.addReadyListener(function (config) {
      t.deepEqual(config.getProjectId(), projectId);
      t.deepEqual(config.getProjectNumber(), null, 'project number should remain null');
      s.done();
      t.end();
    });
    c.addErrorListener(function (config) {
      t.fail("Should not callback the error function");
      s.done();
      t.end();
    });
  }
);

test(
  'Testing local value assignment in init process on a Configuration instance '+
  'for project id in env variable',
  function (t) {
    var projectId = 'test-123';
    process.env.GCLOUD_PROJECT = projectId;
    var c = new Configuration();
    var s = nock(
     'http://metadata.google.internal/computeMetadata/v1/project'
    ).get('/numeric-project-id').times(1).reply(500);
    c.init();
    c.addReadyListener(function (config) {
      t.deepEqual(config.getProjectId(), projectId);
      t.deepEqual(config.getProjectNumber(), null, 'project number should remain null');
      delete process.env.GCLOUD_PROJECT;
      s.done();
      t.end();
    });
    c.addErrorListener(function (config) {
      t.fail("Should not callback the error function");
      delete process.env.GCLOUD_PROJECT;
      s.done();
      t.end();
    });
  }
);


test(
  'Testing local value assignment in init process on a Configuration instance '+
  'for service context',
  function (t) {
    var projectId = 'test-123';
    var serv = {service: 'test', version: '1.2.x'};
    var c = new Configuration({projectId: projectId, serviceContext: serv});
    var s = nock(
     'http://metadata.google.internal/computeMetadata/v1/project'
    ).get('/numeric-project-id').times(1).reply(500);
    c.init();
    c.addReadyListener(function (config) {
      t.deepEqual(config.getServiceContext(), serv);
      s.done();
      t.end();
    });
    c.addErrorListener(function (config) {
      t.fail("Should not callback the error function");
      s.done();
      t.end();
    });
  }
);

test(
  'Testing local value assignment in init process on a Configuration instance '+
  'for service context negative cases',
  function (t) {
    var projectId = 'test-123';
    var serv = {service: null, version: 123};
    var c = new Configuration({projectId: projectId, serviceContext: serv});
    var s = nock(
     'http://metadata.google.internal/computeMetadata/v1/project'
    ).get('/numeric-project-id').times(1).reply(500);
    c.init();
    c.addReadyListener(function (config) {
      t.deepEqual(config.getServiceContext(), {service: '', version: ''});
      s.done();
      t.end();
    });
    c.addErrorListener(function (config) {
      t.fail("Should not callback the error function");
      s.done();
      t.end();
    });
  }
);

test(
  'Testing local value assignment in init process on a Configuration instance '+
  'for service context in env variable',
  function (t) {
    var projectId = 'test-123';
    var name = 'test';
    var ver = 'test2';
    process.env.GCLOUD_PROJECT = projectId;
    process.env.GAE_MODULE_NAME = name;
    process.env.GAE_MODULE_VERSION = ver;
    var c = new Configuration();
    var s = nock(
     'http://metadata.google.internal/computeMetadata/v1/project'
    ).get('/numeric-project-id').times(1).reply(500);
    c.init();
    c.addReadyListener(function (config) {
      t.deepEqual(config.getServiceContext(), {service: name, version: ver});
      delete process.env.GCLOUD_PROJECT;
      delete process.env.GAE_MODULE_VERSION;
      s.done();
      t.end();
    });
    c.addErrorListener(function (config) {
      t.fail("Should not callback the error function");
      delete process.env.GCLOUD_PROJECT;
      s.done();
      t.end();
    });
  }
);

test(
  'Testing local value assignment in init process on a Configuration instance '+
  'for key',
  function (t) {
    var projectId = 'test-123';
    var key = '1337';
    var c = new Configuration({key: key, projectId: projectId});
    var s = nock(
     'http://metadata.google.internal/computeMetadata/v1/project'
    ).get('/numeric-project-id').times(1).reply(500);
    c.init();
    c.addReadyListener(function (config) {
      t.deepEqual(config.getKey(), key);
      s.done();
      t.end();
    });
    c.addErrorListener(function (config) {
      t.fail("Should not callback the error function");
      s.done();
      t.end();
    });
  }
);

test(
  'Testing local value assignment in init process on a Configuration instance '+
  'for reportUncaughtExceptions',
  function (t) {
    var projectId = 'test-123';
    var key = '1337';
    var c = new Configuration({reportUncaughtExceptions: false, 
      projectId: projectId});
    var s = nock(
     'http://metadata.google.internal/computeMetadata/v1/project'
    ).get('/numeric-project-id').times(1).reply(500);
    c.init();
    c.addReadyListener(function (config) {
      t.deepEqual(config.getReportUncaughtExceptions(), false);
      s.done();
      t.end();
    });
    c.addErrorListener(function (config) {
      t.fail("Should not callback the error function");
      s.done();
      t.end();
    });
  }
);

test(
  'Testing service value assignment in init process on a configuration instance',
  function (t) {
    var projectNumber = '1234';
    var s = nock(
     'http://metadata.google.internal/computeMetadata/v1/project'
    ).get('/numeric-project-id').times(1).reply(200, projectNumber);
    var c = new Configuration();
    c.addErrorListener(function (e) {
      console.log("here is the error", e);
      t.fail("The Configuration should not callback to an error listener if " +
        "inited with the numeric-project-id endpoint accessible");
      s.done();
      t.end();
    });
    c.addReadyListener(function (config) {
      t.pass("The Configuration should callback to the ready listener");
      t.deepEqual(config.getProjectNumber(), projectNumber);
      s.done();
      t.end();
    });
    c.init();
  }
);
