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
      console.error(chalk`{red {bold Notice: Keep you Personal Access Token ABSOLUTELY CONFIDENTIAL}}.`);
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

const parseSpec = (spec, dest) => {
  if (!dest && /^[0-9a-f]{40}$/.test(spec)) {
    return { sha1: spec };
  }
  if (!spec) {
    return {};
  }
  const sp = spec === '' ? [] : spec.split('/', 3);
  switch (sp.length) {
    case 0:
      return {};
    case 1:
      return dest ? { repo: sp[0] } : { user: sp[0] };
    case 2:
      return dest ? { repo: sp[0], branch: sp[1] } : { user: sp[0], repo: sp[1] };
    default:
      return { user: sp[0], repo: sp[1], branch: sp[2] };
  }
};

const show = ({ user, repo, branch }) => `https://github.com/${user}/${repo}/tree/${branch}`;

const runUpdate = async ({ what, from, force, create, delete: del, dryRun }, token) => {
  debug({ what, from, force, create, dryRun });
  what = parseSpec(what, true);
  from = parseSpec(from, false);
  debug({ what, from });
  const hs = new HubSync({ token });
  const cfg = await hs.fill({ what, from, force })
  if (create) {
    console.error(chalk`{green Will create ${show(cfg.what)}}`);
  } else if (del) {
    console.error(chalk`{red Will delete ${show(cfg.what)}}`);
  } else {
    const forceful = force ? chalk`{red {bold FORCED}}` : chalk`{dim (fast forward only)}`;
    console.error(chalk`{cyan Will update ${show(cfg.what)}} ${forceful}`);
  }
  if (!del) {
    if (cfg.from.sha1) {
      console.error(chalk`{magenta ^ from SHA-1 ${cfg.from.sha1}}`);
    } else {
      console.error(chalk`{magenta ^ from upstream ${show(cfg.from)}}`);
    }
  }
  try {
    const old = !create && await hs.getRefs(cfg.what);
    const sha = !del && (cfg.from.sha1 || await hs.getRefs(cfg.from));
    if (create) {
      console.error(chalk`Got upstream head SHA-1: {yellow ${sha}}`);
    } else if (del) {
      console.error(chalk`Got origin head SHA-1: {yellow ${old}}`);
    } else {
      console.error(chalk`Got origin head SHA-1: {yellow ${old}}`);
      if (cfg.from.sha1) {
        console.error(chalk`Use the specified SHA-1: {yellow ${sha}}`);
      } else {
        console.error(chalk`Got upstream head SHA-1: {yellow ${sha}}`);
      }
      if (old === sha) {
        console.error(chalk`{greenBright Skipped:} {yellow ${show(cfg.what)}} is already in sync.`);
        return true;
      }
    }
    if (force) {
      console.error(chalk`{magenta This is a dangerous operation that {bold may lead to data loss}.}`);
      console.error(chalk`{magenta If you do experience data loss and you want to recover, run this first:}`);
      console.error(chalk`{magenta {bold >} hub-sync -c ${cfg.what.user}/${cfg.what.repo}/hub-sync-recovery-${cfg.what.branch} ${old}}`);
      console.error(chalk`{magenta and manually recover the data from the two branches.}`);
    }
    if (dryRun) {
      console.error(chalk`Stopped because of {cyan --dry-run}`);
      return true;
    }
    if (del) {
      const res = await hs.delRefs(cfg.what);
      console.error(chalk`{green Succeed:} {yellow ${show(cfg.what)}} has been {redBright {strikethrough deleted}}`);
      debug(res);
    } else {
      const res = await hs.setRefs(cfg.what, sha, { force, create });
      if (create) {
        console.error(chalk`{green Succeed:} {yellow ${show(cfg.what)}} has been {green created}.`);
      } else {
        console.error(chalk`{green Succeed:} {yellow ${show(cfg.what)}} has been {cyan synchronized}.`);
      }
      debug(res);
    }
    return true;
  } catch (e) {
    if (!e) throw e;
    if (!e.response) throw e;
    if (!e.response.data) throw e;
    if (e.response.data.message === 'Not Found') {
      console.error(chalk`{red Failed: {italic ${e.response.data.message}.}} {dim Possible reasons:}`);
      console.error(chalk`Case 1. You have not forked this repo yet.`);
      console.error(chalk`    {dim Solution: Fork it on GitHub if you want. hub-sync takes care of synchronization, not initial forking.}`);
      console.error(chalk`Case 2. You specified {yellow wrong branches} and/or repos.`);
      console.error(chalk`    {dim Solution: Double check the command line and fix the error.}`);
      console.error(chalk`Case 3. A branch has {yellow already been deleted}.`);
      console.error(chalk`    {dim Solution: No need to worry.}`);
    } else if (e.response.data.message === 'Reference does not exist') {
      console.error(chalk`{red Failed: {italic ${e.response.data.message}.}} {dim Possible reasons:}`);
      console.error(chalk`Case 1. You specified {yellow wrong branches} and/or repos.`);
      console.error(chalk`    {dim Solution: Double check the command line and fix the error.}`);
      console.error(chalk`Case 2. You want to re-create a branch that {yellow has been deleted} before.`);
      console.error(chalk`    {dim Solution: Use {reset --create}.}`);
      console.error(chalk`Case 3. The upstream repo developers {yellow created a new branch}.`);
      console.error(chalk`    {dim Solution: Use {reset --create}.}`);
    } else if (e.response.data.message === 'Reference already exists') {
      console.error(chalk`{red Failed: {italic ${e.response.data.message}.}} {dim Possible reasons:}`);
      console.error(chalk`Case 1. You specified {yellow wrong branches} and/or repos.`);
      console.error(chalk`    {dim Solution: Double check the command line and fix the error.}`);
      console.error(chalk`Case 2. You want to create a branch that has {yellow already been created}.`);
      console.error(chalk`    {dim Solution: No need to worry.}`);
      console.error(chalk`Case 3. You want to {yellow update} an exiting branch, not creating a new one.`);
      console.error(chalk`    {dim Solution: Do {reset NOT} use {reset --create}.}`);
    } else if (e.response.data.message === 'Update is not a fast forward') {
      console.error(chalk`{red Failed: {italic ${e.response.data.message}.}} {dim Possible reasons:}`);
      console.error(chalk`Case 1. You specified {yellow wrong branches} and/or repos.`);
      console.error(chalk`    {dim Solution: Double check the command line and fix the error.}`);
      console.error(chalk`Case 2. {yellow Your branch is ahead} of upstream (i.e. you have some changes that upstream doesn't).`);
      console.error(chalk`    {dim Solution: hub-sync won't help in this case. Refer to this guide:}`);
      console.error(chalk`    {dim {underline https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/syncing-a-fork}}`);
      console.error(chalk`Case 3. The upstream repo developers {yellow force-pushed {italic their} branches}.`);
      console.error(chalk`    {dim Solution: If you are 100% sure what you are doing, go for {reset --force}. Be extra extra careful in this case.}`);
      console.error(chalk`    {dim You {reset will} lose data if the case is not handled carefully.}`);
    } else {
      throw e;
    }
    return false;
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
        describe: '<other>[/<repo>[/<branch>]] The upstream repo. | <sha1>',
        type: 'string',
      });
  }, async (argv) => {
    if (argv.delete && argv.from) {
      console.error(chalk`{red You cannot specify both --delete and <from>.}`);
      process.exit(1);
    }
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
      if (e.response && e.response.data && e.response.data.message) {
        console.error(chalk`{red Unknown error occured:} {redBright {italic ${e.response.data.message}}}`);
      } else {
        console.error(chalk`{red Unknown error occured:} {redBright {italic ${e.message}}}`);
      }
      console.error(chalk`{yellow Please report the bug, including the info below, to the developer.}`);
      console.error(chalk`{yellow Where to report: {underline https://github.com/b1f6c1c4/hub-sync}}`);
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
