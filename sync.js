const axios = require('axios');
const debug = require('debug')('hub-sync');

class HubSync {
  constructor(config) {
    const { token } = config;
    this.config = token;
    this.axios = axios.create({
      baseURL: 'https://api.github.com',
      timeout: 10000,
      maxContentLength: 20000,
      headers: { Authorization: 'token ' + token },
    });
    this.axios.interceptors.response.use((r) => {
      debug(r.status + ' ' + r.statusText);
      return r;
    }, (e) => {
      debug(e.response.status + ' ' + e.response.statusText);
      return Promise.reject(e);
    });
  }

  run(cfg) {
    debug(cfg);
    return this.axios(cfg);
  }

  async getRefs({ user, repo, branch }) {
    const { data } = await this.run({
      method: 'get',
      url: `/repos/${user}/${repo}/git/refs/heads/${branch}`,
    });
    return data.object.sha;
  }

  async setRefs({ user, repo, branch }, sha, { force, create }) {
    if (create) {
      const { data } = await this.run({
        method: 'post',
        url: `/repos/${user}/${repo}/git/refs`,
        data: {
          ref: `refs/heads/${branch}`,
          sha,
        },
      });
      return data;
    }
    const { data } = await this.run({
      method: 'patch',
      url: `/repos/${user}/${repo}/git/refs/heads/${branch}`,
      data: {
        sha,
        force: !!force,
      },
    });
    return data;
  }

  async delRefs({ user, repo, branch }) {
    const { data } = await this.run({
      method: 'delete',
      url: `/repos/${user}/${repo}/git/refs/heads/${branch}`,
    });
    return true;
  }

  async getRepo({ user, repo }) {
    const { data } = await this.run({
      method: 'get',
      url: `/repos/${user}/${repo}`,
    });
    return data;
  }

  async getMe() {
    const { data } = await this.run({
      method: 'get',
      url: '/user',
    });
    return data.login;
  }

  async fill({ what: { user, repo, branch }, from, force }) {
    user = user || await this.getMe();
    if (!from.user || !branch) {
      const { default_branch, parent } = await this.getRepo({ user, repo });
      branch = branch || default_branch;
      if (!from.user) {
        from = {
          user: parent.owner.login,
          repo: parent.name,
        };
      }
    }
    from.repo = from.repo || repo;
    from.branch = from.branch || branch;
    return {
      what: { user, repo, branch },
      from,
      force,
    };
  }
}

module.exports = HubSync;
