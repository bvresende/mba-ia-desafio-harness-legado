import net from 'node:net';

function parseArgs(argv) {
  let preferred = 4000;
  const exclude = new Set();

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--preferred' && i + 1 < argv.length) {
      const parsed = Number.parseInt(argv[i + 1], 10);
      if (Number.isInteger(parsed) && parsed >= 1024 && parsed <= 65535) {
        preferred = parsed;
      }
      i += 1;
    } else if (arg.startsWith('--preferred=')) {
      const parsed = Number.parseInt(arg.slice('--preferred='.length), 10);
      if (Number.isInteger(parsed) && parsed >= 1024 && parsed <= 65535) {
        preferred = parsed;
      }
    } else if (arg === '--exclude' && i + 1 < argv.length) {
      for (const item of argv[i + 1].split(',')) {
        const parsed = Number.parseInt(item.trim(), 10);
        if (Number.isInteger(parsed) && parsed > 0) {
          exclude.add(parsed);
        }
      }
      i += 1;
    } else if (arg.startsWith('--exclude=')) {
      for (const item of arg.slice('--exclude='.length).split(',')) {
        const parsed = Number.parseInt(item.trim(), 10);
        if (Number.isInteger(parsed) && parsed > 0) {
          exclude.add(parsed);
        }
      }
    }
  }

  return { preferred, exclude };
}

function tryListen(options, ignoreUnsupported = false) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();

    const finish = (ok) => {
      server.removeAllListeners();
      resolve(ok);
    };

    server.once('error', (err) => {
      if (
        ignoreUnsupported &&
        (err.code === 'EAFNOSUPPORT' || err.code === 'EADDRNOTAVAIL' || err.code === 'EINVAL')
      ) {
        finish(true);
        return;
      }
      finish(false);
    });

    server.once('listening', () => {
      server.close(() => finish(true));
    });

    server.listen(options);
  });
}

async function isPortFree(port) {
  if (!(await tryListen({ port, host: '127.0.0.1' }))) {
    return false;
  }
  if (!(await tryListen({ port, host: '0.0.0.0' }))) {
    return false;
  }
  if (!(await tryListen({ port, host: '::', ipv6Only: true }, true))) {
    return false;
  }
  return true;
}

function getEphemeralPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once('error', reject);
    server.listen({ port: 0, host: '127.0.0.1' }, () => {
      const address = server.address();
      const port = typeof address === 'object' && address !== null ? address.port : 0;
      server.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(port);
      });
    });
  });
}

async function main() {
  const { preferred, exclude } = parseArgs(process.argv.slice(2));
  const maxPort = Math.min(preferred + 1000, 65535);

  for (let port = preferred; port <= maxPort; port += 1) {
    if (exclude.has(port)) {
      continue;
    }
    if (await isPortFree(port)) {
      process.stdout.write(`${port}\n`);
      return;
    }
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const port = await getEphemeralPort();
    if (port > 0 && !exclude.has(port)) {
      process.stdout.write(`${port}\n`);
      return;
    }
  }

  process.stderr.write('Failed to allocate a free TCP port\n');
  process.exit(1);
}

main().catch((err) => {
  process.stderr.write(`${err?.message || err}\n`);
  process.exit(1);
});
