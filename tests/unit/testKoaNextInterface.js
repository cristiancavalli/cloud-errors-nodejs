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

var EventEmitter = require('events').EventEmitter;
var assert = require('assert');
var merge = require('lodash.merge');
var koaNext = require('../../src/interfaces/koaNext.js');
var ErrorMessage = require('../../src/classes/error-message.js');
var Configuration = require('../fixtures/configuration.js');
var createLogger = require('../../src/logger.js');

function noOp () {
  return;
}

describe('koaNext interface', function () {
  before(function () {
    try {
      createDeferredPromise();
    } catch (e) {
      this.skip(
        'Skipping koaNext interface testing due to lack of promise support');
    }
  });
  describe('Intended behaviour', function () {
    var stubbedConfig = new Configuration({
      serviceContext: {
        service: "a_test_service"
        , version: "a_version"
      }
    }, createLogger({logLevel: 4}));
    var stubbedCtx = {
      request: {
        method: 'GET',
        url: '/route',
        ip: '::1',
        headers: {
          'user-agent': 'Something akin to Mozilla',
          referrer: 'http://www.reddit.com/r/netsec/'
        }
      },
      response: {
        status: 200
      }
    };
    stubbedConfig.lacksCredentials = function () {
      return false;
    };
    var client = {
      sendError: noOp
    };
    var testError = new Error("This is a test");
    var validBoundHandler = koaNext(client, stubbedConfig);
    var stubApp = new EventEmitter();
    afterEach(function () {
      client.sendError = noOp;
      stubApp.removeAllListeners();
    });
    it('Should catch the error with context', function (done) {
      client.sendError = function (em) {
        assert.deepEqual(em,
          merge(
            new ErrorMessage().setMessage(testError.stack)
              .setServiceContext(stubbedConfig._serviceContext.service,
                stubbedConfig._serviceContext.version)
              .setHttpMethod(stubbedCtx.request.method).setUrl(stubbedCtx.request.url)
              .setRemoteIp(stubbedCtx.request.ip)
              .setUserAgent(stubbedCtx.request.headers['user-agent'])
              .setReferrer(stubbedCtx.request.headers.referrer)
              .setResponseStatusCode(stubbedCtx.response.status),
            {eventTime: em.eventTime}
          )
        );
        done();
      };
      var validBoundHandler = koaNext(client, stubbedConfig);
      validBoundHandler(stubApp);
      setImmediate(function () {stubApp.emit('error', testError, stubbedCtx)});
    });
    it('Should catch the error without context', function (done) {
      client.sendError = function (em) {
        assert.deepEqual(em,
          merge(
            new ErrorMessage().setMessage(testError.stack)
              .setServiceContext(stubbedConfig._serviceContext.service,
                stubbedConfig._serviceContext.version),
            {eventTime: em.eventTime}
          )
        );
        done();
      };
      var validBoundHandler = koaNext(client, stubbedConfig);
      validBoundHandler(stubApp);
      setImmediate(function () {stubApp.emit('error', testError)});
    });
    it('Should not attach if lacking credentials', function (done) {
      // Make sure to override client.lacksCredentials
      stubbedConfig.lacksCredentials = function () {return true;};
      client.sendError = function (em) {
        assert(false, 'It should not attach and call send error');
        done();
      };
      var validBoundHandler = koaNext(client, stubbedConfig);
      validBoundHandler(stubApp);
      setImmediate(function () {
        stubApp.on('error', function (e) {
          // Stub the error handler so it doesn't throw
        });
        stubApp.emit('error', testError);
        setTimeout(function () {
          done();
        }, 50);
      });
    });
  });
});
