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
var ErrorMessage = require('../classes/error-message.js');
var koaRequestInformationExtractor = require('../request-extractors/koa.js');
var errorHandlerRouter = require('../error-router.js');

/**
 * The koaNextErrorHandler function is a wrapper function which provides the
 * user-interface function with the configuration information and client
 * machinery to talk to the Stackdriver error reporting service.
 * @function koaNextErrorHandler
 * @param {AuthClient} - The API client instance to report errors to Stackdriver
 * @param {NormalizedConfigurationVariables} - The application configuration
 * @returns {Function} - The function used to catch errors yielded by downstream
 *  request handlers.
 */
function koaNextErrorHandler(client, config) {

  /**
   * The actual error handler for the Koa plugin attempts to catch the results
   * of downstream request handlers by attaching to the error event on the
   * koa app instance. This handler should be invoked with a koa app instance
   * as early as possible so that errors can be caught as early as possible.
   * @param {Error} err - the error which occurred
   * @param {Object} [ctx] - the request/response context if applicable
   * @returns {Undefined} does not return anything
   */
  return function (app) {
    if (config.lacksCredentials()) {
      return;
    }
    app.on('error', function (err, ctx) {
      var svc = config.getServiceContext();
      var em = new ErrorMessage().setServiceContext(svc.service, svc.version);
      if (ctx) {
        em.consumeRequestInformation(
          koaRequestInformationExtractor(ctx.request, ctx.response));
      }
      errorHandlerRouter(err, em);
      client.sendError(em);
    });
  };
}

module.exports = koaNextErrorHandler;
