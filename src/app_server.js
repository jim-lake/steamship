'use strict';

const express = require('express');
const site_manager = require('./site_manager.js');
const app_renderer = require('./app_renderer.js');

const router = new express.Router();
exports.router = router;

router.use(_serverMiddleware);

function _serverMiddleware(req, res) {
  const hostname = req.hostname || '';
  const path = req.path || '';

  const site_data = site_manager.get(hostname, path);

  if (!site_data) {
    res.header('Cache-Control', 'public, max-age=60');
    res.sendStatus(404);
  } else {
    const { content_type, body } = app_renderer.render(site_data);

    res.header('Cache-Control', 'public, max-age=60');
    res.header('Content-Type', content_type);
    res.send(body);
  }
}
