const os = require('os');
const path = require('path');
const fs = require('fs');
const yargRoot = require('yargs');
const debug = require('debug')('hub-sync');
const HubSync = require('./sync');

const readToken = ({ token, tokenFile }) => {
  if (token) {
    return token;
  }
  try {
    return fs.readFileSync(tokenFile, 'utf-8').trim();
  } catch (e) {
    console.error(`Error occured during reading token file ${tokenFile}.`);
    console.error('Please check its existance and permission.');
    return undefined;
  }
}

const parseSpec = (spec = '', omitUser = false) => {
  const sp = spec === '' ? [] : spec.split('/', 3);
  switch (sp.length) {
    case 0:
      return {};
    case 1:
      return omitUser ? { repo: sp[0] } : { user: sp[0] };
    case 2:
      return omitUser ? { repo: sp[0], branch: sp[1] } : { user: sp[0], repo: sp[1] };
    default:
      return { user: sp[0], repo: sp[1], branch: sp[2] };
  }
};

const show = ({ user, repo, branch }) => `https://github.com/${user}/${repo}/tree/${branch}`;

const runUpdate = async ({ what, from, force, create, delete: del, dryRun }, token) => {
  debug({ what, from, force, create, dryRun });
  what = parseSpec(what, true);
  from = parseSpec(from);
  debug({ what, from });
  const hs = new HubSync({ token });
  const cfg = await hs.fill({ what, from, force })
  if (create) {
    console.log(`Will create ${show(cfg.what)} <- ${show(cfg.from)} (force: ${force})`);
  } else if (del) {
    console.log(`Will delete ${show(cfg.what)}`);
  } else {
    console.log(`Will update ${show(cfg.what)} <- ${show(cfg.from)} (force: ${force})`);
  }
  const sha = await hs.getRefs(del ? cfg.what : cfg.from);
  if (del) {
    console.log(`Got origin head sha: ${sha}`);
  } else {
    console.log(`Got upstream head sha: ${sha}`);
  }
  if (dryRun) {
    console.log('Stopped because --dry-run');
    return;
  }
  if (del) {
    const res = await hs.delRefs(cfg.what);
    console.log(`Succeed, ${show(cfg.what)} is deleted`);
    debug(res);
  } else {
    const res = await hs.setRefs(cfg.what, sha, { force, create });
    console.log(`Succeed, ${show(cfg.what)} is at ${res.object.sha}`);
    debug(res);
  }
}

module.exports = yargRoot
  .option('token-file', {
    describe: 'Github token file, see https://github.com/settings/tokens',
    default: path.join(os.homedir(), '.hub-sync'),
    type: 'string',
  })
  .option('t', {
    alias: 'token',
    describe: 'Github token, see https://github.com/settings/tokens',
    type: 'string',
  })
  .command(['modify <what> [<from>]', '$0'], 'Modify github repo', (yargs) => {
    yargs
      .option('f', {
        alias: 'force',
        describe: 'As if `git push --force` (dangerous)',
        type: 'boolean',
      })
      .option('c', {
        alias: 'create',
        describe: 'Create a reference, instead of update',
        type: 'boolean',
      })
      .option('d', {
        alias: 'delete',
        describe: 'Delete a reference, instead of update (dangerous)',
        type: 'boolean',
      })
      .conflicts('c', 'f')
      .conflicts('c', 'd')
      .conflicts('d', 'f')
      .option('n', {
        alias: 'dry-run',
        describe: 'Don\'t actually update',
        type: 'boolean',
      })
      .positional('what', {
        describe: '[[<you>/]]<repo>[/<branch>] Which repo to modify.',
        type: 'string',
        demandCommand: true,
      })
      .positional('from', {
        describe: '<other>[/<repo>[/<branch>]] The upstream repo.',
        type: 'string',
      });
  }, (argv) => {
    const token = readToken(argv);
    if (!token) {
      return;
    }
    runUpdate(argv, token).catch((e) => {
      console.error(e.message);
      if (e.response) {
        console.error(e.response.data);
      }
    });
  })
  .help()
  .parse;
