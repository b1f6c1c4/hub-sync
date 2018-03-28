# hub-sync

[![npm](https://img.shields.io/npm/v/hub-sync.svg?style=flat-square)](https://www.npmjs.com/package/hub-sync)
[![npm](https://img.shields.io/npm/dt/hub-sync.svg?style=flat-square)](https://www.npmjs.com/package/hub-sync)
[![GitHub last commit](https://img.shields.io/github/last-commit/b1f6c1c4/hub-sync.svg?style=flat-square)](https://github.com/b1f6c1c4/hub-sync)
[![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/b1f6c1c4/hub-sync.svg?style=flat-square)](https://github.com/b1f6c1c4/hub-sync)
[![license](https://img.shields.io/github/license/b1f6c1c4/hub-sync.svg?style=flat-square)](https://github.com/b1f6c1c4/hub-sync/blob/master/LICENSE.md)

> Sync your github forks without git.

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
However, this is totally pointless since you actually download all the data from github.com and upload all the way back. (I know git is smart enough to upload only what github.com already has, but you have to download everything first.)

So the solution is to call Github API directly:
```sh
# Assuming you are using HTTPie:
http GET https://api.github.com/repos/<other>/<repo>/git/refs/heads/master
# Find object.sha, and
http PATCH https://api.github.com/repos/<you>/<repo>/git/refs/heads/master "Authorization<token> ..." sha=...
```

Now `hub-sync` does this for you:
```sh
# This can be ran everywhere; it works without git.
hub-sync <you>/<repo>/<branch> <other>/<repo>/<branch> [--force]
```

## Installation

```sh
$ npm install --global hub-sync
```
## Usage

```
hub-sync.js <what> [<from>]

Update github repo

Commands:
  hub-sync.js update <what> [<from>]  Update github repo               [default]

Positionals:
  what  [[<you>/]]<repo>[/<branch>] Which repo to update.               [string]
  from  <other>[/<repo>[/<branch>]] The upstream repo.                  [string]

Options:
  --version      Show version number                                   [boolean]
  --token-file   Github token file, see https://github.com/settings/tokens
                                               [string] [default: "~/.hub-sync"]
  -t, --token    Github token, see https://github.com/settings/tokens   [string]
  --help         Show help                                             [boolean]
  -f, --force    As if `git push --force`                              [boolean]
  -n, --dry-run  Don't actually update                                 [boolean]
```

## License

MIT
