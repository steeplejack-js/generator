/**
 * index
 */

'use strict';

/* Node modules */
const spawn = require('child_process').spawn;
const path = require('path');

/* Third-party modules */
const helpers = require('yeoman-test');

/* Files */

const baseDir = path.resolve(__dirname, '..', '..');

function factory (stackName, prompts) {
  return () => {
    log(stackName, `Building new application: ${JSON.stringify(prompts, null, 2)}`);

    /* Change CWD - this changes after each running */
    process.chdir(baseDir);

    return helpers
      .run(path.join(process.cwd(), 'generators', 'app'))
      .withPrompts(prompts)
      .then(dir => {
        log(stackName, dir);

        /* Run npm install */
        return runner(stackName, dir, 'npm install')
          .then(() => runner(stackName, dir, 'npm run test:lint:src -- --fix', {
            allowFail: true
          }))
          .then(() => runner(stackName, dir, 'npm run test:lint:test -- --fix', {
            allowFail: true
          }))
          .then(() => runner(stackName, dir, 'npm run ci'))
          .then(() => runner(stackName, dir, 'npm run serve', {
            timeout: 5000
          }))
          .then(() => log(stackName, 'Completed successfully'));
      })
      .catch(err => {
        log(stackName, err);

        process.exit(1);
      });
  };
}

function log (stack, message) {
  console.log(`[${stack}] ${message}`);
}

function runner (stack, cwd, cmd, { allowFail = false, env = undefined, timeout = null } = {}) {
  return new Promise((resolve, reject) => {
    log(stack, `Running script: ${cmd}`);

    const args = cmd.split(' ');

    const command = args.shift();

    const runningProcess = spawn(command, args, {
      cwd,
      env
    });

    runningProcess.stdout.on('data', (data) => {
      log(stack, data);
    });

    runningProcess.stderr.on('data', (data) => {
      log(stack, data);
    });

    if (timeout) {
      setTimeout(() => {
        runningProcess.kill('SIGTERM');
        resolve();
      }, timeout);
    } else {
      setTimeout(() => {
        runningProcess.kill('SIGTERM');
        reject(new Error('Exceeded runner timeout'));
      }, 300000);

      runningProcess.on('close', (code) => {
        if (code === 0 || allowFail) {
          resolve();
          return;
        }

        reject();
      });
    }
  });
}

/* Define the applications */
const apps = [
  factory('expressNoCompile', {
    author: 'expressNoCompile',
    compile: false,
    description: 'expressNoCompile description',
    envvarPrefix: 'ENC',
    lint: 'none',
    name: 'express-no-compile',
    server: 'express',
    sockets: false
  }),
  factory('expressCompile', {
    author: 'expressCompile',
    compile: true,
    description: 'expressCompile description',
    envvarPrefix: 'EC',
    lint: 'airbnb',
    name: 'express-compile',
    server: 'express',
    sockets: true
  }),
  factory('restifyNoCompile', {
    author: 'restifyNoCompile',
    compile: false,
    description: 'restifyNoCompile description',
    envvarPrefix: 'RNC',
    lint: 'semistandard',
    name: 'restify-no-compile',
    server: 'restify',
    sockets: false
  }),
  factory('restifyCompile', {
    author: 'restifyCompile',
    compile: true,
    description: 'restifyCompile description',
    envvarPrefix: 'RC',
    lint: 'standard',
    name: 'restify-compile',
    server: 'restify',
    sockets: true
  })
];

apps.reduce((thenable, app) => thenable
  .then(() => app()), Promise.resolve())
  .then(() => process.exit(0))
  .catch(err => {
    console.log('GENERAL EXCEPTION');
    console.log(err);
    process.exit(999);
  });
