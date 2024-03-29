'use strict';

const async = require('async');
const safe_regex = require('safe-regex');
const db = require('./tools/db.js');
const util = require('./tools/util.js');

exports.init = init;
exports.load = load;
exports.get = get;
exports.getAllSitePaths = getAllSitePaths;

const RELOAD_MS = 15 * 1000;

let g_loadTimeout = null;

let g_siteMap = {};
let g_hostnameMap = {};
let g_hostnameRegexList = [];
let g_appResourceMap = {};
let g_appVerMap = {};
let g_appMap = {};

function init(done) {
  console.log('site_manager.init: START');
  load((err) => {
    console.log('site_manager.init: DONE:', err);
    if (!err) {
      _reload();
    }
    done(err);
  });
}

function _reload() {
  clearTimeout(g_loadTimeout);
  g_loadTimeout = setTimeout(() => {
    load(_reload);
  }, RELOAD_MS);
}

function get(hostname, path) {
  const site = _getSiteByHostname(hostname);

  let site_path;
  if (site) {
    site_path = _getSitePath(site, path);
  }
  let app_resource;
  if (site_path) {
    const { app_resource_id } = site_path;
    app_resource = g_appResourceMap[app_resource_id];
  }

  let ret;
  if (app_resource) {
    const app_ver = g_appVerMap[app_resource.app_ver_id];
    const app = g_appMap[app_ver.app_id];

    ret = {
      site,
      site_path,
      app,
      app_ver,
      app_resource,
    };
  }
  return ret;
}

function getAllSitePaths(site_id, done) {
  load((err) => {
    let site_data;
    if (!err) {
      const site = g_siteMap[site_id];
      if (!site) {
        err = 'site_not_found';
      } else {
        const path_list = [];

        const path_key_list = Object.keys(site.path_map);
        path_key_list.forEach((path) => {
          const site_path = site.path_map[path];
          const app_resource = g_appResourceMap[site_path.app_resource_id];
          const app_ver = g_appVerMap[app_resource.app_ver_id];
          const app = g_appMap[app_ver.app_id];
          path_list.push({
            path,
            site_path,
            app_resource,
            app_ver,
            app,
          });
        });

        site_data = util.deepClone({
          site,
          path_list,
        });
      }
    }

    done(err, site_data);
  });
}

function _getSiteByHostname(hostname) {
  hostname = hostname.toLowerCase();

  let site_id = g_hostnameMap[hostname];
  if (site_id === undefined) {
    const match = g_hostnameRegexList.find((site) => site.regex.test(hostname));
    if (match) {
      site_id = match.site_id;
    }
  }

  return g_siteMap[site_id];
}
function _getSitePath(site, path) {
  let site_path = site.path_map[path];
  if (!site_path) {
    const match = site.path_regex_list.find(({ regex }) => regex.test(path));
    if (match) {
      site_path = match.site_path;
    }
  }
  return site_path;
}

function load(done) {
  let hostname_map;
  let hostname_regex_list;
  let site_map;
  let app_map;
  let app_ver_map;
  let app_resource_map;

  async.series(
    [
      (done) =>
        _loadSiteHosts((err, new_map, new_list) => {
          hostname_map = new_map;
          hostname_regex_list = new_list;
          done(err);
        }),
      (done) =>
        _loadSites((err, new_map) => {
          site_map = new_map;
          done(err);
        }),
      (done) =>
        _loadAppResources((err, app, app_ver, app_resource) => {
          app_map = app;
          app_ver_map = app_ver;
          app_resource_map = app_resource;
          done(err);
        }),
    ],
    (err) => {
      if (!err) {
        g_hostnameMap = hostname_map;
        g_hostnameRegexList = hostname_regex_list;
        g_siteMap = site_map;

        g_appMap = app_map;
        g_appVerMap = app_ver_map;
        g_appResourceMap = app_resource_map;
      }
      done && done(err);
    }
  );
}

function _loadSiteHosts(done) {
  const sql = `
SELECT site_host.*
FROM site_host
JOIN site USING (site_id)
WHERE site.is_disabled = 0
ORDER BY site_host.priority DESC, site_host_id ASC
`;
  db.queryFromPool(sql, (err, results) => {
    const new_map = {};
    const new_list = [];
    if (err) {
      util.errorLog('_loadSiteHosts: sql err:', err);
    } else {
      results.forEach((result) => {
        const { hostname, hostname_regex, site_id } = result;
        if (hostname) {
          new_map[hostname] = site_id;
        }
        if (hostname_regex) {
          const regex = _getRegex(hostname_regex);
          if (regex) {
            new_list.push({ regex, site_id });
          }
        }
      });
    }
    done(err, new_map, new_list);
  });
}
function _loadSites(done) {
  const sql = `
SELECT *
FROM site_path
JOIN site USING (site_id)
WHERE site_path.is_disabled = 0 AND site.is_disabled = 0
ORDER BY site_path.priority DESC, site_path_id ASC
`;
  db.queryFromPool(sql, (err, results) => {
    const new_map = {};
    if (err) {
      util.errorLog('_loadSites: sql err:', err);
    } else {
      results.forEach((result) => {
        const {
          site_id,
          site_config_json,
          s3_publish_url,
          s3_put_json,
          site_path_id,
          path,
          path_regex,
          app_resource_id,
          site_path_config_json,
        } = result;
        if (!(site_id in new_map)) {
          new_map[site_id] = {
            site_id,
            site_config: _getJson(site_config_json),
            s3_publish_url,
            s3_put_json,
            path_map: {},
            path_regex_list: [],
          };
        }
        const site = new_map[site_id];
        const site_path = {
          site_path_id,
          site_path_config: _getJson(site_path_config_json),
          app_resource_id,
        };

        if (path) {
          site.path_map[path] = site_path;
        }
        if (path_regex) {
          const regex = _getRegex(path_regex);
          if (regex) {
            site.path_regex_list.push({ regex, site_path });
          }
        }
      });
    }
    done(err, new_map);
  });
}
function _loadAppResources(done) {
  const sql = `
SELECT app.*, app_ver.*, app_resource.*
FROM app_resource
JOIN (
  SELECT DISTINCT app_resource_id
  FROM site_path
  JOIN site USING (site_id)
  WHERE site_path.is_disabled = 0 AND site.is_disabled = 0
) s USING (app_resource_id)
JOIN app_ver USING (app_ver_id)
JOIN app USING (app_id)
`;
  const opts = {
    sql,
    nestTables: true,
  };
  db.queryFromPool(opts, (err, results) => {
    const app_map = {};
    const app_ver_map = {};
    const app_resource_map = {};
    if (err) {
      util.errorLog('_loadAppResources: sql err:', err);
    } else {
      results.forEach((result) => {
        const { app, app_ver, app_resource } = result;
        app_map[app.app_id] = app;
        app_ver_map[app_ver.app_ver_id] = app_ver;
        app_resource_map[app_resource.app_resource_id] = app_resource;
      });
    }
    done(err, app_map, app_ver_map, app_resource_map);
  });
}

function _getRegex(string) {
  let regex;
  try {
    if (safe_regex(string)) {
      regex = new RegExp(string);
    }
  } catch (e) {
    /* eslint */
  }
  return regex;
}
function _getJson(string) {
  let ret = {};
  try {
    const obj = JSON.parse(string);
    if (obj && typeof obj === 'object') {
      ret = obj;
    }
  } catch (e) {
    /* eslint */
  }
  return ret;
}
