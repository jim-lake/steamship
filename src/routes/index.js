'use strict';

const express = require('express');
const admin = require('./admin');

const router = new express.Router();
exports.router = router;

router.use('/steamship-admin',admin.router);
