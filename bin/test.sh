#!/usr/bin/env bash

function run {
  if [ "$TRAVIS_TRUSTED_INTERNAL_MERGE" = "true" ]
  then
    echo "Running integration and unit suites"
    openssl aes-256-cbc -K $encrypted_7e22a7c28f69_key \
    -iv $encrypted_7e22a7c28f69_iv -in config.tar.enc \
    -out ../tests/configuration/config.tar -d \
    && tar xvf ../tests/configuration/config.tar
    export GCLOUD_PROJECT=`cat ../tests/configuration/stub_project_id.txt`
    export STUBBED_API_KEY=`cat ../tests/configuration/stub_api_key.txt`
    export GOOGLE_APPLICATION_CREDENTIALS=$(pwd)/tests/configuration/stub_default_credentials.json
    ../node_modules/.bin/istanbul cover -x "fuzzer.js" \
    ../node_modules/tape/bin/tape ../tests/integration/*.js ../tests/unit/*.js \
    --report lcovonly -- -R spec && cat ../coverage/lcov.info \
    | ../node_modules/coveralls/bin/coveralls.js && rm -rf ../coverage
  else
    echo "Running unit suite"
    ../node_modules/.bin/istanbul cover -x "fuzzer.js" \
    ../node_modules/tape/bin/tape ../tests/unit/*.js --report lcovonly -- \
    -R spec && cat ../coverage/lcov.info | \
    ../node_modules/coveralls/bin/coveralls.js && rm -rf ../coverage
  fi
}

run