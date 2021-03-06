/**
 * index
 */

'use strict';

/* Node modules */
const path = require('path');

/* Third-party modules */
const _ = require('lodash');
const chalk = require('chalk');
const Generator = require('yeoman-generator');
const Inquirer = require('inquirer');
const walk = require('walk');
const yosay = require('yosay');

/* Files */
const exportsFn = require('../../helpers/exports');
const importsFn = require('../../helpers/imports');
const validate = require('../../helpers/validation');

module.exports = class Steeplejack extends Generator {

  /**
   * End
   *
   * All done
   *
   * @returns {*}
   */
  end () {
    const endMessage = [];

    const lint = [[
      'run',
      'test:lint:src',
      '--',
      '--fix'
    ], [
      'run',
      'test:lint:test',
      '--',
      '--fix']
    ];

    if (this.options.skipInstall) {
      endMessage.push('As you ran with --skip-install, the linting hasn\'t been fixed');
      endMessage.push('Run the following commands to fix this:');
      lint.forEach(cmd => {
        endMessage.push(`$ npm ${cmd.join(' ')}`);
      });
    } else {
      /* Sort out the linting */
      lint.forEach(cmd => {
        this.spawnCommandSync('npm', cmd);
      });

      const commands = [{
        command: 'yo steeplejack:route',
        desc: 'Configure a new route'
      }, {
        command: 'npm run serve',
        desc: 'Run in dev mode'
      }];

      endMessage.push('All done. Here\'s some more commands for you to choose from:');

      _.each(commands, (opts) => {
        endMessage.push(`${chalk.underline(opts.command)}\n${opts.desc}`);
      });
    }

    return this.log(yosay(endMessage.join('\n\n')));
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
    this.npmInstall();
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
      default: this.config.get('name') || this.appname,
      filter: name => name.replace(/[\W\s]/g, '-')
        .replace(/(-){2,}/, '-')
        .replace(/(-+)$/, '')
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
      filter: author => validate.required(author)
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
      message: 'What do you want to build?',
      choices: [{
        name: 'A full-stack app',
        short: 'Express',
        value: 'express'
      }, {
        name: 'An API only',
        short: 'Restify',
        value: 'restify'
      }],
      default: this.config.get('server')
    }, {
      type: 'confirm',
      name: 'sockets',
      message: 'Do you want web sockets?',
      default: this.config.get('sockets') === undefined ? false : this.config.get('sockets') !== false
    }, {
      type: 'input',
      name: 'envvarPrefix',
      message: 'Environment variable prefix [<none> for no prefix]',
      default: this.config.get('envvarPrefix') || '<none>',
      filter (prefix) {
        if (prefix === '<none>') {
          return '';
        } else if (_.isEmpty(prefix) === false) {
          if (/^\W/.test(prefix)) {
            return Promise.reject('Envvar prefix must begin with a letter');
          }

          const prefixUpper = prefix.toUpperCase()
            .replace(/(_+)$/, '');

          return `${prefixUpper}_`;
        }
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

    const config = this.config.getAll();

    const files = [];

    const ignore = [];

    if (config.lint !== 'airbnb') {
      ignore.push('.eslintrc');
      ignore.push('test/.eslintrc');
      ignore.push('.eslintignore');
    }

    if (config.server === 'restify') {
      ignore.push('src/server/express.js');
      ignore.push('src/themes/*');
      ignore.push('test/unit/server/express.test.js');
      ignore.push('postcss.config.js');
      ignore.push('webpack.config.js');
    } else if (config.server === 'express') {
      ignore.push('src/server/restify.js');
      ignore.push('test/unit/server/restify.test.js');
    }

    if (!config.sockets) {
      ignore.push('src/server/socketio.js');
      ignore.push('test/unit/server/socketio.test.js');
    }

    if (!config.compile && config.server !== 'express') {
      ignore.push('.babelrc');
    }

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

    /* Write all the templates to the destination */
    config.deps = {
      lodash: _,
      exporter: exportsFn(config.compile),
      importer: importsFn(config.compile)
    };

    files.forEach(file => {
      const dst = file.replace(/\.ejs$/, '');

      const isIgnored = ignore.find(filePath => {
        if (dst === filePath) {
          return true;
        } else if (/\*$/.test(filePath)) {
          filePath = filePath.replace('*', '');

          const re = new RegExp(`^${filePath}`);

          return re.test(dst);
        }

        return false;
      });

      if (!isIgnored) {
        const template = this.templatePath(file);

        /* Remove any .ejs ending */
        const destination = this.destinationPath(dst);

        this.fs.copyTpl(template, destination, config);
      }
    });
  }

};
