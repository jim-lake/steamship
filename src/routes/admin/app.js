'use strict';

const express = require('express');

const router = new express.Router();
exports.router = router;

router.post('/1/app_version',_postAppVersion);

function _postAppVersion(req,res) {
  res.sendStatus(501);
}
