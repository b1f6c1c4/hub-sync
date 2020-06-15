# @b1f6c1c4/hub-sync

[![npm](https://img.shields.io/npm/v/@b1f6c1c4/hub-sync.svg?style=flat-square)](https://www.npmjs.com/package/@b1f6c1c4/hub-sync)
[![npm](https://img.shields.io/npm/dt/@b1f6c1c4/hub-sync.svg?style=flat-square)](https://www.npmjs.com/package/@b1f6c1c4/hub-sync)
[![GitHub last commit](https://img.shields.io/github/last-commit/b1f6c1c4/hub-sync.svg?style=flat-square)](https://github.com/b1f6c1c4/hub-sync)
[![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/b1f6c1c4/hub-sync.svg?style=flat-square)](https://github.com/b1f6c1c4/hub-sync)
[![license](https://img.shields.io/github/license/b1f6c1c4/hub-sync.svg?style=flat-square)](https://github.com/b1f6c1c4/hub-sync/blob/master/LICENSE.md)

> Sync your github forks without git in O(1) time, space, and network BW.

## TL;DR

```sh
npm i -g @b1f6c1c4/hub-sync
# Generate a token **with public_repo scope** at https://github.com/settings/tokens
echo the-token > ~/.hub-sync
# Update your webpack fork default branch to the latest of upstream:
hub-sync webpack
# Update your material-ui fork default branch to the latest of upstream:
hub-sync material-ui
# Update your material-ui fork master branch to the latest of upstream:
hub-sync material-ui/master
# Update your antediluvian io.js fork to the latest nodejs:
hub-sync io.js # name doesn't need to match exactly
hub-sync io.js nodejs/node # but you MUST specify the repo if you want to sync to the upstream of upstream
# Create a new branch
hub-sync -c ... ...
# Do it even if not fast-forward (EXTREMELY DANGEROUS)
hub-sync -f ... ...
# Delete a branch (EXTREMELY EXTREMELY DANGEROUS)
hub-sync --delete ... ...
```

## Important notice

There is **NO SAFETY NET** at all for `-f|--force` and `-d|--delete`.
**YOU MAY LOSE ALL YOUR DATA IMMEDIATELY** if not used properly.
Neither Github nor the author of `hub-sync` will be responsible for your loss.
USE AT YOUR OWN RISK. REFER TO THE LICENSE FOR LEGAL ISSUE.

## Why

To keep your github fork up-to-date, the [old-fashioned way](https://help.github.com/articles/syncing-a-fork/) is:
```sh
git clone https://github.com/<you>/<repo>
cd <repo>
git remote add upstream https://github.com/<other>/<repo>
git fetch upstream
git push origin upstream/master<master>
cd ..
rm -rf <repo>.git
```
However, this is totally pointless since you actually download all the data from github.com and upload all the way back. (I know git may be smart enough to upload only what github.com already has, but you have to download everything first.)
This approach takes **as bad as O(n) time, O(n) space, O(n) network bandwidth**.

So the solution is to call Github API directly:
```sh
# Assuming you are using HTTPie:
http GET https://api.github.com/repos/<other>/<repo>/git/refs/heads/master
# Find object.sha, and
http PATCH https://api.github.com/repos/<you>/<repo>/git/refs/heads/master "Authorization<token> ..." sha=...
# If branch non-exist, use the following instead
http POST https://api.github.com/repos/<you>/<repo>/git/refs "Authorization<token> ..." sha=...
```

Now `hub-sync` does this for you, **as smooth as O(1)**:
```sh
# This can be ran everywhere; it works without git.
hub-sync [-f|-c|-d] <you>/<repo>/<branch> <other>/<repo>/<branch>
```

## Wanna take more control over the process, but not to clone everything?

You will need [`git-get`](https://github.com/b1f6c1c4/git-get) and [`git-fancy-push`](https://github.com/b1f6c1c4/git-fancy-push).
The latter one resolved the long-standing "shallow update not allowed" problem.
```bash
git get -g <you>/<repo>
git remote add upstream ...
git fancy-push upstream origin/master:master
```

## Installation

```sh
$ npm install --global @b1f6c1c4/hub-sync
```
## Usage

```
hub-sync.js <what> [<from>]

Update github repo

Commands:
  hub-sync.js modify <what> [<from>]  Modify github repo               [default]

Positionals:
  what  [[<you>/]]<repo>[/<branch>] Which repo to modify.               [string]
  from  <other>[/<repo>[/<branch>]] The upstream repo.                  [string]

Options:
  --version      Show version number                                   [boolean]
  --token-file   Github token file, see https://github.com/settings/tokens
                                               [string] [default: "~/.hub-sync"]
  -t, --token    Github token, see https://github.com/settings/tokens   [string]
  -c, --create   Create a reference, instead of update                 [boolean]
  -d, --delete   Delete a reference, instead of update (dangerous)     [boolean]
  --help         Show help                                             [boolean]
  -f, --force    As if `git push --force` (dangerous)                  [boolean]
  -n, --dry-run  Don't actually update                                 [boolean]
```

## License

MIT
