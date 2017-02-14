/**
 * index
 */

'use strict';

/* Node modules */
const exec = require('child_process').exec;
const fs = require('fs');
const path = require('path');

/* Third-party modules */
const _ = require('lodash');
const beautify = require('gulp-beautify');
const Generator = require('yeoman-generator');
const Inquirer = require('inquirer');
const walk = require('walk');
const yosay = require('yosay');

/* Files */

const validate = {
  required (input) {
    if (_.isEmpty(input)) {
      return Promise.reject('Required');
    }
    return input;
  }
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
    /* Sort out the linting */
    this.spawnCommandSync('npm', [
      'run',
      'test:lint:src',
      '--',
      '--fix'
    ]);

    this.spawnCommandSync('npm', [
      'run',
      'test:lint:test',
      '--',
      '--fix'
    ]);

    return this.log(yosay('All done. Start with "npm run serve"'));
  }

  /**
   * Initializing
   *
   * Let's say hello
   *
   * @returns {*}
   */
  initializing () {
    return this.log(yosay('Hi there, let\'s build a Steeplejack app'));
  }

  /**
   * Install
   *
   * Install the dependencies
   */
  install () {
    const config = this.config.getAll();

    const deps = [
      '@steeplejack/data',
      'bunyan',
      'steeplejack',
      config.server,
      `steeplejack-${config.server}`
    ];

    const devDeps = [
      'chai',
      'chai-as-promised',
      'cross-env',
      'mocha',
      'nodemon',
      'nyc',
      'proxyquire',
      'sinon',
      'sinon-as-promised',
      'sinon-chai',
      'supertest'
    ];

    switch (config.lint) {

      case 'standard':
      case 'semistandard':
        devDeps.push(config.lint);
        break;

      case 'airbnb':
        devDeps.push('eslint');
        devDeps.push('eslint-config-airbnb');
        devDeps.push('eslint-plugin-classes');
        devDeps.push('eslint-plugin-import');
        devDeps.push('eslint-plugin-jsx-a11y');
        devDeps.push('eslint-plugin-react');
        break;

      default:
        /* No linting */
        break;

    }

    this.npmInstall(deps, {
      save: true
    });

    this.npmInstall(devDeps, {
      'save-dev': true
    });
  }

  /**
   * Prompting
   *
   * Ask the questions about the app
   * we're building.
   *
   * @returns {Promise}
   */
  prompting () {
    return this.prompt([{
      type: 'input',
      name: 'name',
      message: 'Project name',
      default: this.config.get('name') || this.appname
    }, {
      type: 'input',
      name: 'description',
      message: 'Description',
      default: this.config.get('description'),
      filter (desc) {
        return validate.required(desc);
      }
    }, {
      type: 'input',
      name: 'author',
      message: 'Author',
      default: this.config.get('author'),
      filter (author) {
        return validate.required(author);
      }
    }, {
      type: 'list',
      name: 'lint',
      message: 'Linting rule set',
      choices: [
        'airbnb',
        'standard',
        'semistandard',
        new Inquirer.Separator(),
        'none'
      ],
      default: this.config.get('lint') || 'airbnb'
    }, {
      type: 'confirm',
      name: 'compile',
      message: 'Compile using Babel',
      default: this.config.get('compile') === undefined ? false : this.config.get('compile') !== false
    }, {
      type: 'list',
      name: 'server',
      message: 'Server framework',
      choices: [
        'express',
        'restify'
      ],
      default: this.config.get('server')
    }, {
      type: 'input',
      name: 'envvarPrefix',
      message: 'Environment variable prefix',
      default: this.config.get('envvarPrefix') || '',
      filter (prefix) {
        if (_.isEmpty(prefix) === false) {
          if (/^\W/.test(prefix)) {
            return Promise.reject('Envvar prefix must begin with a letter');
          }

          const prefixUpper = prefix.toUpperCase()
            .replace(/(_+)$/, '');

          return `${prefixUpper}_`;
        }
      }
    }, {
      type: 'list',
      name: 'quote',
      message: 'Quotes',
      choices: [
        'single',
        'double'
      ],
      default: this.config.get('quote')
    }, {
      type: 'input',
      name: 'indent',
      message: 'Indent size',
      filter (indent) {
        const num = Number(indent);

        if (_.isNaN(num)) {
          return Promise.reject('Indent must be a number');
        } else if (num < 1) {
          return Promise.reject('Indent must be greater than 0');
        }

        return num;
      }
    }]).then(answers => {
      /* Store the answers */
      this.config.set(answers);
    });
  }

  /**
   * Writing
   *
   * Writes the project files
   */
  writing () {
    /* Start with saving the config */
    this.config.save();

    const files = [];

    walk.walkSync(this.templatePath(), {
      listeners: {
        file: (root, fileStats, next) => {
          const regex = new RegExp(`^${this.templatePath()}/?`);
          root = root.replace(regex, '');

          files.push(path.join(root, fileStats.name));

          next();
        }
      }
    });

    /* Write all the templates to the desination */
    const config = this.config.getAll();
    config.deps = {
      lodash: _
    };

    files.forEach(file => {
      const dst = file.replace(/\.txt$/, '');
      const template = this.templatePath(file);

      /* Remove any .txt ending */
      const destination = this.destinationPath(dst);

      this.fs.copyTpl(template, destination, config);
    });
  }

};
