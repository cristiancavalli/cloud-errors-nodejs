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

var inherits = require('util').inherits;

function ClientNotConfiguredToSendErrors() {
  Error.captureStackTrace(this, this.constructor);
  this.message = [
    'Stackdriver error reporting client has not been configured to send',
    'errors, please check the NODE_ENV environment variable and make sure it',
    'is set to "production" or set the ignoreEnvironmentCheck property to ',
    'true in the runtime configuration object'
  ].join(' ');
}

inherits(ClientNotConfiguredToSendErrors, Error);

function UnableToRetrieveProjectId(errMsg) {
  Error.captureStackTrace(this, this.constructor);
  this.message = [
    'Unable to retrieve a project id from the Google Metadata Service or',
    'the local environment. Client will not be able to communicate with',
    'the Stackdriver Error Reporting API without a valid project id', 
    'Please make sure to supply a project id either through the',
    'GCLOUD_PROJECT environmental variable or through the configuration',
    'object given to this library on startup if not running on Google',
    'Cloud Platform.\n Returned error message: \n',
    errMsg
  ].join(' ');
}

inherits(UnableToRetrieveProjectId, Error);

function BadAPIInteraction (intendedAction, errMsg) {
  Error.captureStackTrace(this, this.constructor);
  this.message = [
    'Encountered an error while attempting to',
    intendedAction,
    '\nOriginal Error Message:\n',
    errMsg
  ].join(' ');
}

inherits(BadAPIInteraction, Error);

module.exports = {
  ClientNotConfiguredToSendErrors: ClientNotConfiguredToSendErrors,
  UnableToRetrieveProjectId: UnableToRetrieveProjectId,
  BadAPIInteraction: BadAPIInteraction
};
