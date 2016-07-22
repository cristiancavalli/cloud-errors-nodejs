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
var env = process.env;
var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;
var commonDiag = require('@google/cloud-diagnostics-common');
var utils = commonDiag.utils;
var lodash = require('lodash');
var isPlainObject = lodash.isPlainObject;
var isUndefined = lodash.isUndefined;
var isFunction = lodash.isFunction;
var isBoolean = lodash.isBoolean;
var isNumber = lodash.isNumber;
var isString = lodash.isString;
var isEmpty = lodash.isEmpty;
var isNull = lodash.isNull;
var version = require('../package.json').version;

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
 *  resolution may listen to the `ready` event. The `error` event may be emitted
 *  place of the `ready` event in which case the Configuration instance has
 *  failed to gather necessary information to interact with the Stackdriver
 *  service and all listening components must proceed by operating in `offline`
 *  mode.
 * @param {ConfigurationOptions} givenConfig - The config given by the
 *  hosting application at runtime. Configuration values will only be observed
 *  if they are given as a plain JS object; all other values will be ignored.
 */
var Configuration = function(givenConfig) {
  /**
   * The _initState property denotes whether or not the Configuration instance
   * has fired the `ready` event once. This boolean flag is used on the emission
   * invocation to stop the `ready` event firing more than once.
   * @memberof Configuration
   * @private
   * @type {Boolean}
   * @defaultvalue false
   */
  this._initState = false;
  /**
   * The _initError property denotes whether or not the Configuration instance
   * has initialized and encountered an error during that initialization. Until
   * the _initState property is true and initialization complete the _initError
   * property will remain at its default value: null. If the _initState property
   * is true and the _initError property is null then this denotes that the
   * Configuration instance initialized without error. If the _initState
   * property is true and the _initError propert is an instance of the Error
   * class then this denotes the Configuration instance initialized to an
   * irrecoverable error. 
   * @memberof Configuration
   * @private
   * @type {Error|Null}
   * @defaultvalue null
   */
  this._initError = null;
  /**
   * The _reportUncaughtExceptions property is meant to contain the optional
   * runtime configuration property reportUncaughtExceptions. This property will
   * default to true if not given false through the runtime configuration
   * meaning that the default behavior is to catch uncaught exceptions, report
   * them to the Stackdriver Errors API and then exit. If given false uncaught
   * exceptions will not be listened for and not be caught or reported.
   * @memberof Configuration
   * @private
   * @type {Boolean}
   * @defaultvalue true
   */
  this._reportUncaughtExceptions = true;
  /**
   * The _shouldReportErrorsToAPI property is meant to denote whether or not
   * the Stackdriver error reporting library will actually try to report Errors
   * to the Stackdriver Error API. The value of this property is derived from
   * the `NODE_ENV` environmental variable. If the `NODE_ENV` variable is set to
   * 'production' then the _shouldReportErrorToAPI property will be set to true
   * and error reporting library will attempt to send errors to the Error API.
   * Otherwise the value will remain false and errors will not be reported to
   * the API.
   * @memberof Configuration
   * @private
   * @type {Boolean}
   */
  this._shouldReportErrorsToAPI = env.NODE_ENV === 'production';
  /**
   * The _projectId property is meant to contain the string project id that the
   * hosting application is running under. The project id is a unique string
   * identifier for the project. If the Configuration instance is not able to
   * retrieve a project id from the metadata service or the runtime-given
   * configuration then the property will remain null. If given both a project
   * id through the metadata service and the runtime configuration then the
   * instance will assign the value given by the metadata service over the
   * runtime configuration. If the instance is unable to retrieve a valid
   * project id or number from runtime configuration and the metadata service
   * then this will trigger the `error` event in which listening components must
   * operate in 'offline' mode.
   * {@link https://cloud.google.com/compute/docs/storing-retrieving-metadata}
   * @memberof Configuration
   * @private
   * @type {String|Null}
   * @defaultvalue null
   */
  this._projectId = null;
  /**
   * The _projectNumber property is meant to contain the number project id that
   * the hosting application is running under. The project number is a unique
   * number identifier for the project. If the Configuration instance is unable
   * to retrieve a project number from the metadata service or the runtime
   * configuration then the property will remain null. If given both a project
   * number through the metadata service and the runtime configuration then the
   * instance will assign the value given by the metadata service over the
   * runtime configuration. If the Configuration instance is not able to 
   * retrieve a project number or a project id from runtime configuration or
   * from the metadata service then this will trigger the `error` event in which
   * listening components must operate in 'offline' mode.
   * {@link https://cloud.google.com/compute/docs/storing-retrieving-metadata}
   * @memberof Configuration
   * @private
   * @type {String|Null}
   * @defaultvalue null
   */
  this._projectNumber = null;
  /**
   * The _key property is meant to contain the optional Stackdriver API key that
   * may be used in place of default application credentials to authenticate
   * with the Stackdriver Error API. This property will remain null if a key
   * is not given in the runtime configuration or an invalid type is given as
   * the runtime configuration.
   * {@link https://support.google.com/cloud/answer/6158862?hl=en}
   * @memberof Configuration
   * @private
   * @type {String|Null}
   * @defaultvalue null
   */
  this._key = null;
  /**
   * The _serviceContext property is meant to contain the optional service
   * context information which may be given in the runtime configuration. If
   * not given in the runtime configuration then the property value will remain
   * null.
   * @memberof Configuration
   * @private
   * @type {Object}
   * @default
   */
  this._serviceContext = {service: '', version: ''};
  /**
   * The _version of the Error reporting library that is currently being run.
   * This information will be logged in errors communicated to the Stackdriver
   * Error API.
   * @memberof Configuration
   * @private
   * @type {String}
   */
  this._version = version;
  /**
   * The _givenConfiguration property holds a  ConfigurationOptions object
   * which, if valid, will be merged against by the values taken from the meta-
   * data service. If the _givenConfiguration property is not valid then only
   * metadata values will be used in the Configuration instance.
   * @memberof Configuration
   * @private
   * @type {Object|Null}
   * @defaultvalue null
   */
  this._givenConfiguration = isPlainObject(givenConfig) ? givenConfig : null;
  /**
   * Attempt to get the project number from the metadata service
   * and kick-off the init process. This would be where we kick off the
   * `getProjectId` invocation but since that version is not live yet we use
   * project number for now.
   * @todo (cristiancavalli) - turn this into the getProjectId call when it
   *  goes live and remove the getProjectNumber function and call.
   * @example
   * utils.getProjectId(this._assimilateProjectId.bind(this));
   */
  utils.getProjectNumber(this._assimilateProjectNumber.bind(this));
}
// Extend the Configuration constructor by augmenting it with EventEmitter
inherits(Configuration, EventEmitter);
/**
 * The callback for `utils.getProjectId` this function is responsible for
 * determining whether or not the an error occured in the metadata transaction
 * and, if one did not, assigning the value of the transaction (the project id)
 * to the instance property `_projectId`
 * @memberof Configuration
 * @private
 * @function _assimilateProjectId
 * @param {Error|Null} err - If applicable, the error that occured during the
 *  transaction
 * @param {Null|String} projectId - The project id if successfully retrieved,
 *  null otherwise
 * @returns {Undefined} - does not return anything
 */
Configuration.prototype._assimilateProjectId = function(err, projectId) {
  if (isNull(err) && isString(projectId)) {
    this._projectId = projectId;
  } else {
    console.error(
      'Unable to retrieve project id\n',
      '\t', 'Project id:', projectId, '\n',
      '\t', 'Error:', err
    );
  }
  this._gatherLocalConfiguration();
  this._checkConfigurationIntegrity();
};
/**
 * The callback for `utils.getProjectNumber` this function is responsible for
 * determining whether or not an error occured in the metadata transaction and,
 * if one did not, assigning the value of the transaction (the project number)
 * to the instance property `_projectNumber`.
 * @memberof Configuration
 * @private
 * @function _assimilateProjectNumber
 * @param {Error|Undefined} err - If applicable, the error that occured during 
 *  the transaction
 * @param {Null|Number} projectNum - The project number if successfully 
 *  retrieved, null otherwise.
 * @returns {Undefined} - does not return anything
 */
Configuration.prototype._assimilateProjectNumber = function(err, projectNum) {
  if (isUndefined(err) && isNumber(projectNum)) {
    this._projectNumber = projectNum;
  } else {
    console.error(
      'Unable to retrieve project number\n',
      '\t', 'Project Number:', projectNum, '\n',
      '\t', 'Error:', err
    );
  }
  this._gatherLocalConfiguration();
  this._checkConfigurationIntegrity();
};
/**
 * The _checkConfigurationIntegrity function is meant to be called at the end
 * or metadata service and local initialization. This function checks to see 
 * whether the `_projectId` or `_projectNumber` properties have been set. If one
 * or both of these properties has been set the initialization process is deemed
 * to be a success and the `ready` event will emitted provided this is the
 * first time this function has been called which is determined by the 
 * `_initState` property being at its default value of false. If both the
 * `_projectId` and `_projectNumber` properties are set at thier default values
 * of null and this is the first time the function is run then the
 * initialization process is deemed to be a failure and the `error` event will
 * be emitted.
 * @memberof Configuration
 * @private
 * @function _checkConfigurationIntegrity
 * @fires Configuration#error
 * @fires Configuration#ready
 * @returns {Undefined} - does not return anything
 */
Configuration.prototype._checkConfigurationIntegrity = function() {
  if (this._initState === false) {
    // Instance is now officially initialized
    this._initState = true;
    if (isNull(this._projectId) && isNull(this._projectNumber)) {
      // Irrecoverable configuration error, emit error event
      this._initError = new Error("Unable to gather project id or number");
      /**
       * The error event is emitted when a configuration error has occurred or
       * a configuration is incomplete. If the error event is fired on the
       * instance then the ready event will not be fired on this same instance.
       * In this way the two events execution on one instance should be viewed
       * as mutually exclusive and if an error event is fired all concerned
       * components should have a default operating mode in which access to
       * configuration variables may be non-existent.
       * @event Configuration#error
       * @type {Error} - the error that occured during initialization
       */
      this.emit('error', this._initError);
      return;
    } else {
      /**
       * The ready event is emitted when a configuration instance has finished
       * gathering information from both local and remote sources and did not
       * encounter an irrecoverable error in the process. If the ready is fired
       * on the instance then the error event will not be fired on the same
       * instance. If the ready event is emitted listening components can
       * resume normal operation and safely access finalized configuration
       * properties on the instance.
       * @event Configuration#ready
       * @type {this} - the Configuration instance ready to be addressed
       */
      this.emit('ready', this);
    }
  }
};
/**
 * The _gatherLocalConfiguration function is responsible for determining
 * directly determing whether the properties `reportUncaughtExceptions` and
 * `key`, which can be optionally supplied in the runtime configuration, should
 * be merged into the instance. This function also calls several specialized
 * environmental variable checkers which not only check for the optional runtime
 * configuration supplied values but also the processes environmental values.
 * @memberof Configuration
 * @private
 * @function _gatherLocalConfiguration
 * @returns {Undefined} - does not return anything
 */
Configuration.prototype._gatherLocalConfiguration = function() {
  this._checkLocalProjectId();
  this._checkLocalProjectNumber();
  this._checkLocalServiceContext();
  if (isPlainObject(this._givenConfiguration) {
    if (isBoolean(this._givenConfiguration.reportUncaughtExceptions)) {
      this._reportUncaughtExceptions = this._givenConfiguration
        .reportUncaughtExceptions;
    }
    if (isString(this._givenConfiguration.key)) {
      this._key = this._givenConfiguration.key;
    }
  }
};
/**
 * The _checkLocalProjectId function is responsible for determing whether the
 * _projectId property was set by the metadata service and whether or not the
 * _projectId property should/can be set with a environmental or runtime
 * configuration variable. If, upon execution of the _checkLocalProjectId
 * function, the _projectId property has already been set to a string then it is
 * assumed that this property has been set with the metadata services response.
 * The metadata value for the project id always take precedence over any other
 * locally configured project id value. Given that the metadata service did not
 * set the project id this function will defer next to the value set in the
 * environment named `GCLOUD_PROJECT` if it is set and of type string. If this
 * environmental variable is not set the function will defer to the
 * _givenConfiguration property if it is of type object and has a string
 * property named projectId. If none of these conditions are met then the
 * _projectId property will be left at its default value.
 * @memberof Configuration
 * @private
 * @function _checkLocalProjectId
 * @returns {Undefined} - does not return anything
 */
Configuration.prototype._checkLocalProjectId = function() {
  if (isString(this._projectId)) {
    // already has been set by the metadata service
    return;
  } else if (isString(env.GCLOUD_PROJECT) && !isEmpty(env.GCLOUD_PROJECT)
    && isNaN(env.GCLOUD_PROJECT)) {
    // GCLOUD_PROJECT is set and it is not the project number, set on instance
    this._projectId = env.GCLOUD_PROJECT;
    return;
  } else if (isPlainObject(this._givenConfiguration)
    && !isEmpty(this._givenConfiguration.projectId)
    && isString(this._givenConfiguration.projectId)
    && isNaN(this._givenConfiguration.projectId)) {
      // projectId was set in the runtime configuration and it is not the
      // project number, set on instance
      this._projectId = this._givenConfiguration.projectId;
      return;
  }
};
/**
 * The _checkLocalProjectNumber function is responsible for determing whether
 * the _projectNumber property was set by the metadata service and whether or 
 * not the _projectNumber property should/can be set with a environmental or 
 * runtime configuration variable. If, upon execution of the 
 * _checkLocalProjectNumber function, the _projectNumber property has already
 * been set to a number then it is assumed that this property has been set with
 * the metadata services response. The metadata value for the project number
 * always take precedence over any other locally configured project number
 * value. Given that the metadata service did not set the project number this
 * function will defer next to the value set in the environment named
 * `GCLOUD_PROJECT` if it is set and of type string and this string represents a
 * number (e.g. '123'). If this environmental variable is not set the function
 * will defer to the _givenConfiguration property if it is of type object and
 * has a string property named projectId. If none of these conditions are met
 * then the _projectNumber property will be left at its default value.
 * @memberof Configuration
 * @private
 * @function _checkLocalProjectNumber
 * @returns {Undefined} - does not return anything
 */
Configuration.prototype._checkLocalProjectNumber = function() {
  if (isNumber(this._projectNumber)) {
    // already has been set by the metadata service
    return;
  } else if (isString(env.GCLOUD_PROJECT) && !isEmpty(env.GCLOUD_PROJECT)
    && !isNaN(env.GCLOUD_PROJECT)) {
      // GCLOUD_PROJECT is set and it is the project number, set on instance
      this._projectNumber = env.GCLOUD_PROJECT;
      return;
  } else if (isPlainObject(this._givenConfiguration)
    && !isEmpty(this._givenConfiguration.projectId)
    && isString(this._givenConfiguration.projectId)
    && !isNaN(this._givenConfiguration.projectId)) {
      // projectId was set in the runtime configuration and is the project
      // number, set on instance
      this._projectNumber = this._givenConfiguration.projectId;
      return;
  }
};
/**
 * The _checkLocalServiceContext function is responsible for attempting to
 * source the _serviceContext objects values from runtime configuration and the
 * environment. First the function will check the env for known service context
 * names, if these are not set then it will defer to the _givenConfiguration
 * property if it is set on the instance. The function will check env variables
 * `GAE_MODULE_NAME` and `GAE_MODULE_VERSION` for `_serviceContext.service` and
 * `_serviceContext.version` respectively. If these are not set the 
 * `_serviceContext` properties will be left at default unless the given runtime
 * configuration supplies any values as substitutes.
 * @memberof Configuration
 * @private
 * @function _checkLocalServiceContext
 * @returns {Undefined} - does not return anything
 */
Configuration.prototype._checkLocalServiceContext() = function() {
  var gaeModuleName = env.GAE_MODULE_NAME;
  var gaeModuleVer = env.GAE_MODULE_VERSION;
  this._serviceContext.service = isString(gaeModuleName) ? gaeModuleName : '';
  this._serviceContext.version = isString(gaeModuleVer) ? gaeModuleVer : '';
  if (isPlainObject(this._givenConfiguration)
    && isPlainObject(this._givenConfiguration.serviceContext)) {
    if (isString(this._givenConfiguration.serviceContext.service)) {
      this_serviceContext.service = 
        this._givenConfiguration.serviceContext.service;
    }
    if (isString(this._givenConfiguration.serviceContext.version)) {
      this.serviceContext.version =
        this._givenConfiguration.serviceContext.version;
    }
  }
};
/**
 * Returns the _reportUncaughtExceptions property on the instance.
 * @memberof Configuration
 * @public
 * @function getReportUncaughtExceptions
 * @returns {Boolean} - returns the _reportUncaughtExceptions property
 */
Configuration.prototype.getReportUncaughtExceptions = function() {
  return this._reportUncaughtExceptions;
};
/**
 * Returns the _shouldReportErrorsToAPI property on the instance.
 * @memberof Configuration
 * @public
 * @function getShouldReportErrorsToAPI
 * @returns {Boolean} - returns the _shouldReportErrorsToAPI property
 */
Configuration.prototype.getShouldReportErrorsToAPI = function() {
  return this._shouldReportErrorsToAPI;
};
/**
 * Returns the _projectId property on the instance.
 * @memberof Configuration
 * @public
 * @function getProjectId
 * @returns {String|Null} - returns the _projectId property
 */
Configuration.prototype.getProjectId = function() {
  return this._projectId;
};
/**
 * Returns the _projectNumber property on the instance.
 * @memberof Configuration
 * @public
 * @function getProjectNumber
 * @returns {Number|Null} - returns the _projectNumber property
 */
Configuration.prototype.getProjectNumber = function() {
  return this._projectNumber;
};
/**
 * Returns the _key property on the instance.
 * @memberof Configuration
 * @public
 * @function getKey
 * @returns {String|Null} - returns the _key property
 */
Configuration.prototype.getKey = function() {
  return this._key;
};
/**
 * Returns the _serviceContext property on the instance.
 * @memberof Configuration
 * @public
 * @function getKey
 * @returns {Object|Null} - returns the _serviceContext property
 */
Configuration.prototype.getServiceContext = function() {
  return this._serviceContext;
};
/**
 * Returns the _version property on the instance.
 * @memberof Configuration
 * @public
 * @function getVersion
 * @returns {String} - returns the _version property
 */
Configuration.prototype.getVersion = function() {
  return this._version;
};
/**
 * The addReadyListener provides a defined and documented way to attach to the 
 * `ready` event on a Configuration instance. This interface enforces event
 * `ready` event registration by using the `once` register handle since the 
 * `ready` event is only ever supposed to emitted one time. This interface, at
 * invocation, will also check to see if the `ready` event has already been
 * emitted at which point it will immediately callback to listener.
 * @memberof Configuration
 * @public
 * @function addReadyListener
 * @param {Configuration~readyCallback} callback - the listener to callback on
 * @returns {Undefined} - does not return anything 
 */
Configuration.prototype.addReadyListener = function(callback) {
  if (this._initState === false && isFunction(callback)) {
    // Enforce the one-time fire paradigm
    this.once('ready', callback);
  } else if (this._initState === true && isNull(this._initError)) {
    // Callback immediately as the event already happened
    callback(this);
  }
};
/**
 * The ready event callback is called when a Configuration instance has
 * successfully initialized and is ready to be addressed by concerned 
 * components. A ready event callback has only one parameter - the initialized
 * Configuration instance.
 * @callback Configuration~readyCallback
 * @param {Configuration} - the initialized Configuration instance
 */
/**
 * The addErrorListener provides a defined and documented way to attach to the
 * `error` event on a Configuration instance. This interface enforces event
 * `error` event registration by using the `once` register handle since the
 * `error` event is only supposed to be emitted one time. This interface, at
 * invocation, will also check to see if the `error` event has already been
 * emitted at which point it will immediately callback to the listener.
 * @memberof Configuration
 * @public
 * @function addErrorListener
 * @param {Configuration~errorCallback} callback - the listener to callback on
 * @returns {Undefined} - does not return anything
 */
Configuration.prototype.addErrorListener = function(callback) {
  if (this._initState === false && isFunction(callback)) {
    // Enforce the one-time fire paradigm
    this.once('error', callback);
  } else if (this._initState === true && !isNull(this._initError)) {
    // Callback immediately as the event already happened
    callback(this._initError);
  }
};
/**
 * The error event callback is called when a Configuration instance has
 * unsuccessfully initialized and is unable to be addressed by concerned 
 * components. An error event callback has only one parameter - the error which
 * was encountered during initialization.
 * @callback Configuration~errorCallback
 * @param {Error} - the error encountered durning initialization
 */

module.exports = Configuration;