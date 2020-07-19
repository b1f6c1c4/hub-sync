# @b1f6c1c4/hub-sync

[![npm](https://img.shields.io/npm/v/@b1f6c1c4/hub-sync.svg?style=flat-square)](https://www.npmjs.com/package/@b1f6c1c4/hub-sync)
[![npm](https://img.shields.io/npm/dt/@b1f6c1c4/hub-sync.svg?style=flat-square)](https://www.npmjs.com/package/@b1f6c1c4/hub-sync)
[![GitHub last commit](https://img.shields.io/github/last-commit/b1f6c1c4/hub-sync.svg?style=flat-square)](https://github.com/b1f6c1c4/hub-sync)
[![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/b1f6c1c4/hub-sync.svg?style=flat-square)](https://github.com/b1f6c1c4/hub-sync)
[![license](https://img.shields.io/github/license/b1f6c1c4/hub-sync.svg?style=flat-square)](https://github.com/b1f6c1c4/hub-sync/blob/master/LICENSE.md)

> Sync your github forks without git in O(1) time, space, and network BW.

## Basic usage

1. Install the package with *npm* ([nodejs package manager](https://nodejs.org/)).

    ```bash
    npm i -g @b1f6c1c4/hub-sync
    ```

1. Update your fork *instantly*.
For the first time you run this, you will be asked to generate a [GitHub Personal Access Token](https://github.com/settings/tokens).
Follow the instructions carefully and **keep your token CONFIDENTIAL.**

    ```bash
    hub-sync <name-of-your-fork-repository>
    ```

## Advanced usage

1. Update a certain branch:

    ```bash
    hub-sync <repo>/<branch>
    ```

1. Update from another user's fork:

    ```bash
    hub-sync <your-repo> <another-user>
    ```

1. Update from another user's fork, but with a different name:

    ```bash
    hub-sync <your-repo> <another-user>/<repo>
    ```

1. Update from another user's fork, but with a different name and a different branch:

    ```bash
    hub-sync <your-repo>/<branch> <another-user>/<repo>/<branch>
    ```

1. Point a branch of your repo to a specific SHA-1: (rarely used)

    ```bash
    hub-sync <your-repo>/<branch> <sha-1>
    ```

1. Create a new branch:

    ```bash
    hub-sync -c ... ...
    ```

1. Update even if not fast-forward: **(EXTREMELY DANGEROUS)**

    ```bash
    hub-sync -f ... ...
    ```

1. Delete a branch: **(EXTREMELY EXTREMELY DANGEROUS)**

    ```bash
    hub-sync --delete ... ...
    ```

1. See `hub-sync --help` for the complete usage documentation.

Notice: There is **NO SAFETY NET** at all for `-f|--force` and `-d|--delete`.
**YOU MAY LOSE ALL YOUR DATA IMMEDIATELY** if not used properly.
Neither Github nor the author of `hub-sync` will be responsible for your loss.
USE AT YOUR OWN RISK. REFER TO THE LICENSE FOR LEGAL ISSUE.

## Technical details

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

### Wanna take more control over the process, but not to clone everything?

You will need [`git-get`](https://github.com/b1f6c1c4/git-get) and [`git-fancy-push`](https://github.com/b1f6c1c4/git-fancy-push).
The latter one resolved the long-standing "shallow update not allowed" problem.
```bash
git get -g <you>/<repo>
git remote add upstream ...
git fancy-push upstream origin/master:master
```

## License

MIT
