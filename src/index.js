'use strict';

const multipart = require('connect-multiparty');
const morgan = require('morgan');
const method_override = require('method-override');
const body_parser = require('body-parser');
const cookie_parser = require('cookie-parser');
const errorhandler = require('errorhandler');
const db = require('./tools/db.js');
const util = require('./tools/util.js');

const app_renderer = require('./app_renderer');
const app_server = require('./app_server');
const routes = require('./routes');
const site_manager = require('./site_manager');

//====== express =====

exports.init = init;

let g_isDev = false;

function init(config,done) {
  const {
    is_development,
    app,
    db_config,
    app_config,
  } = config;
  g_isDev = is_development;

  db.init(db_config);

  if (g_isDev) {
    app.use(morgan('[:date] :method :url :status :res[content-length] - :response-time ms'));
  } else {
    app.use(morgan(':remote-addr - - [:date] ":method :url HTTP/:http-version" :status :response-time(ms) ":referrer" ":user-agent"'));
  }
  app.use(allow_text_content_type);
  app.use(allow_cross_domain);

  app.use(body_parser.json({ limit: '50mb' }));
  app.use(body_parser.urlencoded({ extended: false, limit: '50mb' }));
  app.use(multipart());
  app.use(cookie_parser());
  app.use(method_override());

  app.use(routes.router);
  app.use(app_server.router);
  app.use(throw_error_handler);

  app_renderer.init(app_config);
  site_manager.init(done || util.noop);
}

function allow_text_content_type(req,res,next) {
  if (req.is('text/plain')) {
    req.headers['content-type'] = 'application/json';
  }
  next();
}

function allow_cross_domain(req,res,next) {
  const origin = req.get('Origin');

  if (origin || req.method === 'OPTIONS') {
    if (origin) {
      res.header("Access-Control-Allow-Origin",origin);
    } else {
      res.header("Access-Control-Allow-Origin","*");
    }
    res.header("Access-Control-Allow-Methods","GET,PUT,POST,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers","content-type,accept");
    res.header("Access-Control-Max-Age","5");
  }

  if (req.method === 'OPTIONS') {
    res.header("Cache-Control","public, max-age=3600");
    res.header("Vary","Origin");
    res.sendStatus(204);
  } else {
    next();
  }
}

function throw_error_handler(err,req,res,next) {
  util.unlinkFiles(req.files);

  if (err && err.code && err.body && typeof err.code === 'number') {
    res.header("Cache-Control", "no-cache, no-store, must-revalidate");
    res.header("Content-Type","text/plain");
    res.status(err.code).send(err.body.toString());
  } else if (g_isDev) {
    errorhandler()(err,req,res,next);
  } else {
    util.errorLog("Middleware err:",err);
    res.header("Cache-Control", "no-cache, no-store, must-revalidate");
    res.sendStatus(500);
  }
}
