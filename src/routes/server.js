'use strict';

const express = require('express');

const router = new express.Router();
exports.router = router;

router.get(server_middleware);

// eslint-disable-next-line no-unused-vars
function server_middleware(req,res,next) {
  console.log("req.host:",req.host);
  res.sendStatus(404);
}
