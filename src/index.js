import childProcess from 'child_process';

import flowBin from 'flow-bin';

// TODO cleanup
// - drop global handler
// - back to import/export
// - back to babel

const flowServer = () =>
  new Promise((resolve, reject) => {
    let isResolved = false;

    const serverProcess = childProcess.spawn(flowBin, ['server'], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });

    // TODO avoid piling this up forever
    const stderrLines = [];
    serverProcess.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(l => l.trim().length > 0);
      stderrLines.push(...lines);
      lines.forEach((l) => {
        if (l.match(/\] Server is READY$/) != null) {
          isResolved = true;
          resolve(serverProcess.pid);
        }
      });
    });

    const onExit = (code) => {
      const stderr = stderrLines.map(l => `  >>${l}`).join('\n');
      if (!isResolved) {
        reject(new Error(`flow server exited during startup (${code})\n${stderr}`));
      } else {
        process.exit(1);
      }
    };
    serverProcess.on('close', onExit);
    process.on('exit', () => {
      serverProcess.removeListener('close', onExit);
      serverProcess.kill();
    });
  });

const flowCheck = (watch, moreArgs) => {
  const args = watch
    ? ['status', '--color=always', '--no-auto-start', ...(moreArgs || [])]
    : ['check', '--color=always', ...(moreArgs || [])];
  const p = new Promise((resolve, reject) => {
    childProcess.execFile(
      flowBin,
      args,
      { maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => (error ? reject({ error, stdout, stderr }) : resolve()),
    );
  });
  // null rejection handler to silence Node's async rejection handling warning
  p.then(null, () => {});
  return p;
};

const parseErrors = (error, stdout, stderr) => {
  if (error.code !== 2) {
    return { fatalError: stderr };
  }

  const flowErrors = stdout
    .split('\u001B[31;1mError:')
    .map(s => s.replace(/^(\u001B\[0m|\s)*/, '').replace(/(\u001B\[0m|\s)*$/, ''))
    .filter(s => s.length > 0)
    .map(s => `\u001B[0m${s}\u001B[0m`);
  return { flowErrors };
};

function FlowCheckWebpackPlugin() {}

FlowCheckWebpackPlugin.prototype.apply = (compiler) => {
  let watch = false;
  compiler.plugin('watch-run', (watching, callback) => {
    if (!watch) { // this callback fires on every compilation. only do setup the first time
      watch = true;
      flowServer().then(() => { callback(); }, (err) => { callback(err); });
    } else {
      callback();
    }
  });

  let resultPromise;
  compiler.plugin('compile', () => {
    resultPromise = flowCheck(watch);
  });

  compiler.plugin('after-emit', (compilation, callback) => {
    resultPromise.then(() => callback(), ({ error, stdout, stderr }) => {
      const { fatalError, flowErrors } = parseErrors(error, stdout, stderr);
      if (fatalError != null) {
        callback(fatalError);
      } else {
        compilation.errors.push(...flowErrors);
        callback();
      }
    });
  });
};

export default FlowCheckWebpackPlugin;
