'use strict';

const _ = require('lodash');

exports.init = init;
exports.render = render;

let g_appConfig;

function init(app_config) {
  g_appConfig = app_config;
}

function render(site_data) {
  const {
    site,
    site_path,
    app,
    app_ver,
    app_resource,
  } = site_data;
  const site_config = site.site_config || {};
  const site_path_config = site_path.site_path_config || {};
  const { content_type, file_contents } = app_resource;

  const config = _.merge({},site_config,site_path_config);

  let body = file_contents;
  if (config.set_base) {
    const base_url = g_appConfig.base_url_prefix + app_ver.s3_path;
    const base_tag = `<base href="${base_url}" />`;
    body = _appendAfter(body,'<head>',base_tag);
  }
  if (config.title) {
    body = _replaceTagContent(body,'title',config.title);
  }

  return {
    content_type,
    body,
  };
}

function _appendAfter(body,tag,lines) {
  const regex = new RegExp(tag);
  const match = body.match(regex);
  if (match) {
    const index = match.index + tag.length;
    const before = body.slice(0,index);
    const after = body.slice(index);

    body = before + "\n" + lines + "\n" + after;
  }
  return body;
}

function _replaceTagContent(body,tag_name,text) {
  const regex = new RegExp(`<\\w*${tag_name}\\w*>[^<]*<\\w*/\\w*${tag_name}\\w*>`,'i');

  const replace_text = `<${tag_name}>${text}</${tag_name}>`;

  return body.replace(regex,replace_text);
}
