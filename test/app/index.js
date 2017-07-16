/**
 * index
 */

/* Node modules */
const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

/* Third-party modules */
const _ = require('lodash');
const helpers = require('yeoman-test');
const request = require('request-promise-native');
const portscanner = require('portscanner');
const uuid = require('uuid');

/* Files */

function getRandomInts (min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  const low = Math.floor(Math.random() * (max - min)) + min;

  return [
    low,
    low + 1000
  ];
}

/* Get the stack name as the first argument */
const stackName = process.argv[2];
const app = require(`./stacks/${stackName}`);

function factory (stackName, stack) {
  const prompts = stack.opts;

  log(stackName, `Building new application: ${JSON.stringify(prompts, null, 2)}`);

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
        .then(() => portscanner.findAPortNotInUse(...getRandomInts(1000, 9999)))
        .then(port => runner(stackName, dir, 'npm run serve', {
          env: {
            TEST_SERVER_PORT: port
          },
          port,
          tests: stack.tests,
          timeout: 10000
        }))
        .then(() => runner(stackName, dir, 'npm run compile'))
        .then(() => new Promise((resolve, reject) => {
          /* Move build to /tmp folder root */
          const buildDir = path.resolve(os.tmpdir(), uuid.v4());
          fs.move(path.resolve(dir, 'build'), buildDir, (err) => {
            if (err) {
              reject(err);
              return;
            }

            resolve(buildDir);
          });
        }))
        .then(buildDir => {
          return portscanner.findAPortNotInUse(...getRandomInts(1000, 9999))
            .then(port => runner(stackName, buildDir, 'npm start', {
              env: {
                TEST_SERVER_PORT: port
              },
              port,
              tests: stack.tests,
              timeout: 10000
            }));
        })
        .then(() => log(stackName, 'Completed successfully'));
    })
    .catch(err => {
      log(stackName, err);

      process.exit(1);
    });
}

function log (stack, message) {
  console.log(`[${stack}] ${message}`);
}

function runner (stack, cwd, cmd, { allowFail = false, env = undefined, port = 9999, tests = null, timeout = null } = {}) {
  return new Promise((resolve, reject) => {
    log(stack, `Running script: ${cmd}`);

    const args = cmd.split(' ');

    const command = args.shift();

    const envvars = process.env;

    _.forEach(env, (value, key) => {
      envvars[key] = value;
    });

    const runningProcess = spawn(command, args, {
      cwd,
      env: envvars
    });

    runningProcess.stdout.on('data', (data) => {
      log(stack, data);
    });

    runningProcess.stderr.on('data', (data) => {
      log(stack, data);
    });

    if (tests) {
      const testTimeout = tests.timeout || 0;

      setTimeout(() => {
        log(stack, 'Running tests');

        tests.endpoints.reduce((thenable, endpoint) => {
          const url = endpoint.url.replace('{port}', port.toString());
          return thenable
            .then(() => {
              log(stack, `Making call to ${url}`);

              return request({
                method: 'GET',
                resolveWithFullResponse: true,
                simple: false,
                url
              });
            })
            .then(({ statusCode }) => {
              if (statusCode !== endpoint.status) {
                throw new Error(`HTTP Status not matched. Expected: ${endpoint.status} actual: ${statusCode}`);
              }
            });
        }, Promise.resolve())
          .catch(err => reject(err));
      }, testTimeout);
    }

    if (timeout) {
      setTimeout(() => {
        runningProcess.kill('SIGINT');
        runningProcess.kill('SIGTERM');
        resolve();
      }, timeout);
    } else {
      setTimeout(() => {
        runningProcess.kill('SIGINT');
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

/* Run the test */
factory(stackName, app)
  .then(() => process.exit(0))
  .catch(err => {
    console.log('GENERAL EXCEPTION');
    console.log(err);
    process.exit(999);
  });
