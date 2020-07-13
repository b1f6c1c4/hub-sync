const os = require('os');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const yargRoot = require('yargs');
const debug = require('debug')('hub-sync');
const HubSync = require('./sync');
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stderr
});

const readToken = async ({ token, tokenFile }) => {
  if (token) {
    return token;
  }
  try {
    try {
      await fs.promises.access(tokenFile, fs.constants.R_OK);
    } catch {
      console.error(chalk`{magenta hub-sync needs a {bold GitHub Personal Access Token} to update your GitHub repo fork.}`);
      console.error(chalk`Please visit {underline https://github.com/settings/tokens} and follow the instructions:`);
      console.error(chalk`1. {italic If asked}, type your GitHub account password`);
      console.error(chalk`2. Click the {green {italic Generate new token}} button.`);
      console.error(chalk`3. Type "{cyan hub-sync}" in the {yellow {italic Note}} input box.`);
      console.error(chalk`4. In the {yellow {italic Select scopes}} section, locate {yellow {italic repo}} subsection and select "{green public_repo}".`);
      console.error(chalk`5. Click the {green {italic Generate token}} button at the very bottom of the page.`);
      console.error(chalk`{red Notice: Keep you Personal Access Token} {red {bold ABSOLUTELY CONFIDENTIAL}}.`);
      console.error(chalk`6. Copy-paste the token here:`);
      console.error(chalk`(your token will be saved to {yellow ${tokenFile}}, so you don't need to generate token every time you update your fork.)`);
      const res = await new Promise((resolve) => {
        rl.question('Your token: ', (input) => { resolve(input.trim()); } );
      });
      if (!/^[0-9a-f]{40}$/.test(res)) {
        console.error(chalk`{red It doesn't look like a valid token. Give up.}`);
        return undefined;
      }
      console.error(chalk`{magenta Token recieved, trying to save to} {yellow ${tokenFile}}`);
      await fs.promises.writeFile(tokenFile, res, 'utf-8');
      console.error(chalk`{green Token saved to} {yellow ${tokenFile}} successfully`);
    }
    return (await fs.promises.readFile(tokenFile, 'utf-8')).trim();
  } catch (e) {
    console.error(chalk`{red Error occured when accessing token file} {yellow ${tokenFile}}.`);
    console.error('Please check its existance and permission.');
    console.error('Also make sure if the folder it belongs to actually exist.');
    console.error(chalk.dim(e.stack));
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
  }, async (argv) => {
    const token = await readToken(argv);
    if (!token) {
      process.exit(2);
    }
    try {
      if (await runUpdate(argv, token)) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    } catch (e) {
      console.error(chalk`{red Unknown error occured. Please report the following information to the developer.}`);
      console.error(chalk`{yellow Where to report bug: {underline https://github.com/b1f6c1c4/hub-sync}}`);
      console.error(chalk`{yellow Error details:}`);
      console.error(chalk.dim(e.stack));
      if (e.response) {
        console.error(chalk.dim(JSON.stringify(e.response.data)));
      }
    };
    process.exit(1);
  })
  .help()
  .parse;
