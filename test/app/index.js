/**
 * index
 */

/* Node modules */
const { spawn } = require('child_process');
const path = require('path');

/* Third-party modules */
const helpers = require('yeoman-test');
const request = require('request-promise-native');

/* Files */

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
        .then(() => runner(stackName, dir, 'npm run serve', {
          tests: stack.tests,
          timeout: 5000
        }))
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

function runner (stack, cwd, cmd, { allowFail = false, env = undefined, tests = null, timeout = null } = {}) {
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

    if (tests) {
      const testTimeout = tests.timeout || 0;

      setTimeout(() => {
        log(stack, 'Running tests');

        tests.endpoints.reduce((thenable, endpoint) => {
          return thenable
            .then(() => {
              log(stack, `Making call to ${endpoint.url}`);

              return request({
                method: 'GET',
                resolveWithFullResponse: true,
                simple: false,
                url: endpoint.url
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
