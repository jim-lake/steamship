'use strict';

const _ = require('lodash');
const async = require('async');
const crypto = require('crypto');
const fs = require('fs');
const util = require('util');

exports.requiredProp = requiredProp;
exports.optionalProp = optionalProp;
exports.optionalBool = optionalBool;
exports.inspect = inspect;
exports.errorLog = errorLog;
exports.deepClone = deepClone;
exports.md5 = md5;
exports.urlCat = urlCat;
exports.between = between;
exports.isBetween = isBetween;
exports.retryWrapper = retryWrapper;
exports.getTime = getTime;
exports.filterInPlace = filterInPlace;
exports.unlinkFiles = unlinkFiles;
exports.noop = noop;

function requiredProp(req,prop,is_sensitive) {
  if (is_sensitive && prop in req.query) {
    throw { code: 400, body: prop + " not allowed in get params" };
  }

  let v;
  if (prop in req.body) {
    v = req.body[prop];
  } else if (prop in req.query) {
    v = req.query[prop];
  } else {
    throw { code: 400, body: prop + " is required" };
  }
  return v;
}

function optionalProp(req,prop,default_val) {
  let v = default_val;
  if (prop in req.body) {
    v = req.body[prop];
  } else if (prop in req.query) {
    v = req.query[prop];
  }
  return v;
}
function optionalBool(req,prop,default_val) {
  let ret = default_val;

  let v = req.body[prop];
  if (v === undefined) {
    v = req.query[prop];
  }
  if (v !== undefined) {
    ret = v === true || v === 1 || v === 'true' || v === '1';
  }
  return ret;
}

function inspect() {
  const s = _.reduce(arguments,(memo,a,index) => {
    if (index > 0) {
      memo += " ";
    }

    if (typeof a == 'object') {
      memo += util.inspect(a,{ depth: 99 });
    } else {
      memo += a;
    }
    return memo;
  },"");
  console.log(s);
}

function errorLog() {
  var s = util.format.apply(this,arguments);
  console.error("[" + new Date().toUTCString() + "] " + s);
  return s;
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function urlCat() {
  let url = "";
  _.each(arguments,(part) => {
    if (url.length > 0 && url.charAt(url.length -1) != '/') {
      url += "/";
    }
    if (part.charAt(0) == '/') {
      url += part.slice(1);
    } else {
      url += part;
    }
  });
  return url;
}

function md5() {
  const hash = crypto.createHash('md5');
  _.each(arguments,(i) => {
    hash.update(i.toString(),'utf8');
  });
  return hash.digest('hex');
}

function between(value,min,max) {
  return Math.max(Math.min(value,max),min);
}
function isBetween(value,min,max) {
  return value >= min && value <= max;
}

function retryWrapper(callback,done) {
  if (!done) {
    done = function() {};
  }

  const FACTOR = 2;
  const MIN_MS = 500;
  const MAX_MS = 60*1000;

  let success = false;
  let attempt = 0;

  async.until(() => success,done => {
    attempt++;
    let timeout = 0;
    if (attempt > 1) {
      timeout = Math.round((Math.random() + 1) * MIN_MS * Math.pow(FACTOR,attempt));
      timeout = Math.min(timeout,MAX_MS);
    }

    setTimeout(() => {
      callback(err => {
        if (!err) {
          success = true;
        }
        done();
      });
    },timeout);
  },done);
}
function getTime(date) {
  return (date && date.getTime()) || null;
}
function filterInPlace(array,callback) {
  for(let i = array.length - 1 ; i >= 0 ; i--) {
    if (!callback(array[i],i)) {
      array.splice(i,1);
    }
  }
}

function unlinkFiles(files) {
  for (let key in files) {
    const file = files[key];
    fs.unlink(file.path,noop);
  }
}

function noop() {}
