import childProcess from 'child_process';

import flowBin from 'flow-bin';

class RingBuffer {
  constructor(capacity) {
    this.capacity = capacity;
    this.length = 0;
    this.head = 0;
    this.elements = new Array(this.capacity);
  }

  append(x) {
    this.elements[this.head] = x;
    this.head = (this.head + 1) % this.capacity;
    this.length = Math.min(this.length + 1, this.capacity);
  }

  contents() {
    const cts = new Array(this.length);
    for (let i = 0; i < this.length; i += 1) {
      const j = (this.head + i) % this.capacity;
      cts[i] = this.elements[j];
    }
    return cts;
  }
}

const flowServer = () =>
  new Promise((resolve, reject) => {
    let isResolved = false;

    const serverProcess = childProcess.spawn(flowBin, ['server'], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });

    const stderrLines = new RingBuffer(10);
    serverProcess.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(l => l.trim().length > 0);
      lines.forEach((l) => {
        stderrLines.append(l);
        if (l.match(/\] Server is READY$/) != null) {
          isResolved = true;
          resolve(serverProcess.pid);
        }
      });
    });

    const onExit = (code) => {
      const stderr = stderrLines.contents().map(l => `  >>${l}`).join('\n');
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
    .map((errStr) => {
      const l1 = errStr.indexOf('\n');
      const fname = errStr.substring(0, l1)
        .replace(/\u001B\[[0-9;]*m/g, '')
        .trim()
        .replace(/:\d+$/, '');
      const errMsg = errStr.substring(l1 + 1)
        .replace(/Found \d+ errors?/, '')
        .replace(/^(\u001B\[0m|\s)*/, '')
        .replace(/(\u001B\[0m|\s)*$/, '');

      if (fname === '' || errMsg === '') {
        return '';
      }
      return `${fname}\n\u001B[0m${errMsg}\u001B[0m`;
    })
    .filter(s => s.length > 0);
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

module.exports = FlowCheckWebpackPlugin;
module.exports.default = FlowCheckWebpackPlugin;
