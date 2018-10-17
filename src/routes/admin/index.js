'use strict';

const express = require('express');
const app = require('./app.js');

const router = new express.Router();
exports.router = router;

router.use(app.router);
