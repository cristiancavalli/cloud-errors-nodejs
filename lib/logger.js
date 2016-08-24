var logger = require('@google/cloud-diagnostics-common').logger;
/**
 * Creates an instance of the Google Cloud Diagnostics logger class. This
 * instance will be configured to log at the level given by the environment or
 * the runtime configuration property `logLevel`. If neither of these inputs are
 * given or valid then the logger will default to logging at log level `WARN`.
 * Order of precedence for logging level is:
 * 1) Environmental variable `GCLOUD_ERRORS_LOGLEVEL`
 * 2) Runtime configuration property `logLevel`
 * 3) Default log level of `WARN`
 * @function createLogger
 * @param {String|Number} givenLevel - a number or stringified decimal
 *  representation of a number between and including 1 through 5
 * @returns {Object} - returns an instance of the logger created with the given/
 *  default options
 */
function createLogger (givenLevel) {
  var logEnv = process.env.GCLOUD_ERRORS_LOGLEVEL;
  var logLevel = logger.warn;
  if (!isNaN(logEnv)) {
    logLevel = logEnv;
  } else if (!isNaN(givenLevel)) {
    logLevel = givenLevel;
  }
  return logger.create(logLevel, '@google/cloud-errors');
}

module.exports = createLogger;
