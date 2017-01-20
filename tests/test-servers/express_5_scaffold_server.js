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

var has = require('lodash.has');
var niv = require('npm-install-version');
niv.install('express@5.0.0-alpha.2');
var express = niv.require('express@5.0.0-alpha.2');
var app = express();
var errorHandler = require('../../index.js')({
  ignoreEnvironmentCheck: true
});
var bodyParser = require('body-parser');

app.use(bodyParser.json());

app.post(
  '/testErrorHandling'
  , function (req, res, next) {
    if (has(req.body, 'test') && req.body.test !== true) {
      return next(new Error("Error on Express Regular Error POST Route"));
    } else {
      res.send("Success");
      res.end();
    }
  }
);

app.get(
  '/customError'
  , function (req, res, next) {
    errorHandler.report(
      "Error on Express Custom Error GET Route"
      , function (err, res) {
        if (err) {
          console.log('Got error trying to report error');
          console.log(err);
        } else {
          console.log("Successfully sent custom get error to api");
        }
      }
    );
    res.send("Success");
    res.end();
    next();
  }
);

app.get(
  '/getError'
  , function (req, res, next) {
    return next(new Error("Error on Express Regular Error GET Route"));
  }
)

app.use(errorHandler.express);

function reportManualError ( ) {
  console.log("Reporting a manual error..");
  errorHandler.report(new Error("This is a manually reported error"), null,
    null, function (err, res) {
      if (err) {
        console.log('Got an error trying to report error', err);
      } else {
        console.log('Successfully sent error information to the API');
      }
    }
  );
}

app.listen(
  3000
  , function ( ) {
    console.log('Scaffold Server has been started on port 3000');
    reportManualError();
  }
);
