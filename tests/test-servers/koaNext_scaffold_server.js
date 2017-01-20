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
const PORT = 3000;
const niv = require('npm-install-version');
niv.install('koa@2.0');
const Koa = niv.require('koa@2.0');
const app = new Koa();
const errorHandler = require('../../index.js')({
  ignoreEnvironmentCheck: true,
  serviceContext: {
    service: 'my-service-123',
    version: 'my-service-version-123'
  }
});

errorHandler.koaNext(app);

app.use(function (ctx, next) {
  //This will set status and message
  ctx.status = 500;
  ctx.message = 'Three token string';
  throw new Error('Three token string');
  return next();
});


// response
app.use(function (ctx){
  ctx.body = 'Hello World';
});

app.listen(PORT);
console.log('Server listening @', PORT);
