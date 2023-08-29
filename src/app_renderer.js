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
    //app,
    app_ver,
    app_resource,
  } = site_data;
  const site_config = site.site_config || {};
  const site_path_config = site_path.site_path_config || {};
  const { content_type, file_contents } = app_resource;

  const config = _.merge({}, site_config, site_path_config);

  let body = file_contents;
  if (config.set_base) {
    const base_url = g_appConfig.base_url_prefix + app_ver.s3_path;
    const base_tag = `<base href="${base_url}" />`;
    body = _appendAfterTag(body, 'head', base_tag);
  }
  if (config.title) {
    body = _replaceTagContent(body, 'title', config.title);
  }
  if (config.body_class) {
    body = _appendTagProperty(body, 'body', 'class', ' ' + config.body_class);
  }
  if (config.json_inject) {
    let script_text = '<script>';
    for (let key in config.json_inject) {
      const val = config.json_inject[key];
      script_text += `window.${key}=`;
      script_text += JSON.stringify(val);
      script_text += ';';
    }
    script_text += '</script>';

    body = _appendAfterTag(body, 'body', script_text);
  }
  if (config.text_replacements) {
    body = _applyAll(body, config.text_replacements, _replaceText);
  }

  return {
    content_type,
    body,
  };
}

function _appendAfterTag(body, tag_name, lines) {
  const regex = new RegExp(`<\\w*${tag_name}[^>]*>`);
  const match = body.match(regex);
  if (match) {
    const index = match.index + match[0].length;
    const before = body.slice(0, index);
    const after = body.slice(index);
    body = before + '\n' + lines + '\n' + after;
  }
  return body;
}

function _appendTagProperty(body, tag_name, prop_name, content) {
  const regex = new RegExp(`<\\w*${tag_name}([^>]*)`, 'i');
  const match = body.match(regex);
  if (match) {
    const props = match[1];
    let index = match.index + match[0].length;
    if (props) {
      const prop_regex = new RegExp(`\\w*${prop_name}\\w*=\\w*['"][^'"]*`, 'i');
      const prop_match = props.match(prop_regex);
      if (prop_match) {
        index += prop_match.index + prop_match[0].length;
      } else {
        content = ` ${prop_name}="${content}"`;
      }
    } else {
      content = ` ${prop_name}="${content}"`;
    }

    const before = body.slice(0, index);
    const after = body.slice(index);
    body = before + content + after;
  }
  return body;
}

function _replaceTagContent(body, tag_name, text) {
  const regex = new RegExp(
    `<\\w*${tag_name}\\w*>[^<]*<\\w*/\\w*${tag_name}\\w*>`,
    'i'
  );

  const replace_text = `<${tag_name}>${text}</${tag_name}>`;

  return body.replace(regex, replace_text);
}

function _replaceText(body, item) {
  const { search, replace } = item;

  return body.replace(search, replace);
}

function _applyAll(body, arg, action) {
  if (Array.isArray(arg)) {
    arg.forEach((item) => {
      body = action(body, item);
    });
  } else {
    body = action(body, arg);
  }
  return body;
}
