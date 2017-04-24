/**
 * index
 */

'use strict';

/* Node modules */

/* Third-party modules */
const beautify = require('gulp-beautify');
const Generator = require('yeoman-generator');
// const Server = require('steeplejack/lib/server');
const walk = require('walk');
const yosay = require('yosay');

/* Files */
const fileFactory = require('../../helpers/fileFactory');
const validate = require('../../helpers/validation');

// @todo get from Server
const Server = {
  allowableHTTPMethods: [
    'GET',
    'POST',
    'PUT',
    'DELETE',
    'HEAD',
    'OPTIONS',
    'PATCH'
  ]
};

module.exports = class Steeplejack extends Generator {

  /**
   * End
   *
   * All done
   *
   * @returns {*}
   */
  end () {
    return this.log(yosay('All done.'));
  }

  /**
   * Initializing
   *
   * Let's say hello
   *
   * @returns {*}
   */
  initializing () {
    return this.log(yosay('Hi there, let\'s add a Steeplejack route'));
  }

  /**
   * Prompting
   *
   * Ask the questions about the route
   * we're building.
   *
   * @returns {Promise}
   */
  prompting () {
    this.answers = {
      method: 'GET',
      url: 'hello/world',
      description: 'Some very long description that I\'m going to put on multiple lines'
    };
    return this.prompt([{
      type: 'list',
      name: 'method',
      message: 'HTTP method',
      choices: Server.allowableHTTPMethods
    }, {
      type: 'input',
      name: 'url',
      message: 'URL',
      filter: url => {
        let formatted = `/${url}/`
          .replace(/(\/+)/g, '/');

        if (formatted !== '/') {
          formatted = formatted
            .replace(/\/$/, '');
        }

        return validate.required(formatted);
      }
    }, {
      type: 'confirm',
      name: 'confirm',
      message: answers => `This will create the route ${answers.method}:${answers.url} - are you sure?`
    }]).then(answers => {
      if (!answers.confirm) {
        /* Denied */
        this.log(yosay('Cancelled'));
        process.exit(1);
      }

      this.answers = answers;
    });
  }

  /**
   * Writing
   *
   * Writes the route files
   */
  writing () {
    return fileFactory(this, 'route', {
      compile: true,
      description: this.answers.description,
      path: `src/routes/${this.answers.url}.js`,
      opts: {
        method: this.answers.method,
        type: 'route'
      }
    });
  }

};
