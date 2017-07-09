/**
 * index
 */

'use strict';

/* Node modules */
const { spawn } = require('child_process');
const path = require('path');

/* Third-party modules */
const helpers = require('yeoman-test');

/* Files */

function factory (stackName, prompts) {
  return () => {
    log(stackName, `Building new application: ${JSON.stringify(prompts, null, 2)}`);

    return helpers
      .run(path.join(process.cwd(), 'generators', 'app'))
      .withPrompts(prompts)
      /* Run npm install */
      .then(dir => runner(stackName, dir, 'npm install')
        .then(dir => runner(stackName, dir, 'npm run ci'))
        .then(dir => runner(stackName, dir, 'npm run serve', 5000))
        .then(dir => log(stackName, 'Completed successfully')))
      .catch(err => log(stackName, err));
  };
}

function log (stack, message) {
  console.log(`[${stack}] ${message}`);
}

function runner (stack, cwd, cmd, timeout = null) {
  return new Promise((resolve, reject) => {
    log(stack, `Running script: ${cmd}`);

    const args = cmd.split(' ');

    const command = args.shift();

    const runningProcess = spawn(command, args, {
      cwd
    });

    runningProcess.stdout.on('data', (data) => {
      log(stack, data);
    });

    runningProcess.stderr.on('data', (data) => {
      log(stack, data);
    });

    if (timeout) {
      setTimeout(() => {
        runningProcess.kill();
        resolve();
      }, timeout);
    } else {
      setTimeout(() => {
        runningProcess.kill();
        reject(new Error('Exceeded runner timeout'));
      }, 300000);

      runningProcess.on('close', (code) => {
        if (code === 0) {
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
    process.exit(1);
  });