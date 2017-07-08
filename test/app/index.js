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

const factory = prompts => helpers
  .run(path.join(process.cwd(), 'generators', 'app'))
  .withPrompts(prompts);

const runner = (cwd, cmd, timeout = null) => new Promise((resolve, reject) => {
  const args = cmd.split(' ');

  const command = args.shift();

  const runningProcess = spawn(command, args, {
    cwd
  });

  runningProcess.stdout.on('data', (data) => {
    console.log(`[${cwd} ${cmd}]: ${data}`);
  });

  runningProcess.stderr.on('data', (data) => {
    console.log(`[${cwd} ${cmd}]: ${data}`);
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
    }, 60000);

    runningProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject();
    });
  }
});

Promise
  .all([
    /* Define the applications */
    factory({
      author: 'expressNoCompile',
      compile: false,
      description: 'expressNoCompile description',
      envvarPrefix: 'ENC',
      lint: 'none',
      name: 'express-no-compile',
      server: 'express',
      sockets: false
    }),
    factory({
      author: 'expressCompile',
      compile: true,
      description: 'expressCompile description',
      envvarPrefix: 'EC',
      lint: 'airbnb',
      name: 'express-compile',
      server: 'express',
      sockets: true
    }),
    factory({
      author: 'restifyNoCompile',
      compile: false,
      description: 'restifyNoCompile description',
      envvarPrefix: 'RNC',
      lint: 'semistandard',
      name: 'restify-no-compile',
      server: 'restify',
      sockets: false
    }),
    factory({
      author: 'restifyCompile',
      compile: true,
      description: 'restifyCompile description',
      envvarPrefix: 'RC',
      lint: 'standard',
      name: 'restify-compile',
      server: 'restify',
      sockets: true
    })
  ])
  /* Run npm install */
  .then(dirs => Promise.all(dirs.map(cwd => new Promise((resolve, reject) => {
    const install = spawn('npm', [ 'install' ], { cwd });

    install.stdout.on('data', (data) => {
      console.log(`[${cwd}]: ${data}`);
    });

    install.stderr.on('data', (data) => {
      console.log(`[${cwd}]: ${data}`);
    });

    install.on('close', (code) => {
      if (code === 0) {
        resolve(cwd);
        return;
      }

      reject(new Error('npm install error'));
    });
  }))))
  .then(dirs => dirs.reduce((thenable, dir) => {
    return thenable
      .then(() => runner(dir, 'npm run ci'))
      .then(() => runner(dir, 'npm run serve', 5000));
  }, Promise.resolve()))
  .then(() => process.exit(0))
  .catch((err) => {
    /* Display errors for easier debugging */
    console.log(err.stack || err);
    process.exit(1);
  });
