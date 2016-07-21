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
var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;
var lodash = require('lodash');
var isPlainObject = lodash.isPlainObject;

/**
 * The Configuration constructor function initializes several internal
 * properties on the Configuration instance and accepts a runtime-given
 * configuration object which may be used by the Configuration instance
 * depending on the initialization transaction that occurs with the meta-data
 * service.
 * @class Configuration
 * @extends EventEmitter
 * @classdesc The Configuration class represents the runtime configuration of
 *  the Stackdriver error handling library. This Configuration class accepts the
 *  configuration options potentially given through the application interface
 *  but it also preferences values received from the metadata service over
 *  values given through the application interface. Becuase the Configuration
 *  class must handle async network I/O it exposes an EventEmitter interface
 *  wherein components interested in waiting for the instances configuration
 *  resolution may listen to the `ready` event. The `ready` event may also
 *  callback with an error in which the listening functions must reconcile thier
 *  operations with an failed configuration.
 * @param {ConfigurationOptions} givenConfig - The config given by the
 *  hosting application at runtime. Configuration values will only be observed
 *  if they are given as a plain JS object; all other values will be ignored.
 */
var Configuration = function (givenConfig) {
  
  /**
   * The _initState property denotes whether or not the Configuration instance
   * has fired the `ready` event once. This boolean flag is used on the emission
   * function to stop the `ready` event firing more than once.
   * @memberof Configuration
   * @private
   * @type {Boolean}
   */
  this._initState = false;
  /**
   * The _givenConfiguration property holds a valid ConfigurationOptions object
   * which, if valid, will be merged against by the values taken from the meta-
   * data service. If the _givenConfiguration property is not valid then only
   * metadata values will be used in the Configuration instance.
   * @memberof Configuration
   * @private
   * @type {Object|Null}
   */
  this._givenConfiguration = isPlainObject(givenConfig) ? givenConfig : null;
  this._projectId = null;
  this._projectNumber = null;
}
// Extend the Configuration constructor by augmenting it with EventEmitter
inherits(Configuration, EventEmitter);


module.exports = Configuration;