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
var ErrorMessage = require('../classes/error-message.js');

/**
 * The handler setup function serves to produce a bound instance of the
 * of a factory for ErrorMessage class instances with configuration-supplied
 * service contexts automatically set.
 * @function handlerSetup
 * @param {NormalizedConfigurationVariables} config - the environmental
 *  configuration
 * @returns {ErrorMessage} - a new ErrorMessage instance
 */
function handlerSetup(config) {
  /**
   * The interface for creating new instances of the ErrorMessage class which
   * can be used to send custom payloads to the Error reporting service.
   * @returns {ErrorMessage} - returns a new instance of the ErrorMessage class
   */
  function newMessage() {
    return new ErrorMessage().setServiceContext(
                         config.getServiceContext().service,
                         config.getServiceContext().version);
  }

  return newMessage;
}

module.exports = handlerSetup;
