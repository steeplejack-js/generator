/**
 * validation
 */

/* Node modules */

/* Third-party modules */
const _ = require('lodash');

/* Files */

module.exports = {
  required (input) {
    if (_.isEmpty(input)) {
      return Promise.reject('Required');
    }
    return input;
  }
};
