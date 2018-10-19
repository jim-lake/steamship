'use strict';

const async = require('async');
const express = require('express');
const fs = require('fs');
const db = require('../../tools/db.js');
const util = require('../../tools/util.js');

const router = new express.Router();
exports.router = router;

router.post('/1/app_ver',_validateUploadToken,_postAppVer);

function _postAppVer(req,res) {
  res.header('Cache-Control',"no-cache, no-store, must-revalidate");
  const app_id = req.app.app_id;

  const version = util.requiredProp(req,'version');
  const version_hash = util.requiredProp(req,'version_hash');
  const s3_path = util.requiredProp(req,'s3_path');

  const file_keys = Object.keys(req.files);
  if (file_keys.length === 0) {
    throw { code: 400, body: "version requires entry points" };
  }

  let connection;
  let app_ver_id;
  async.series([
    done => {
      const sql = "START TRANSACTION;";
      db.queryFromPoolWithConnection(sql,(err,result,conn) => {
        if (err) {
          util.errorLog("_postAppVer: start err:",err);
        }
        connection = conn;
        done(err);
      });
    },
    done => {
      const sql = "INSERT INTO app_ver SET ?";
      const values = {
        app_id,
        version,
        version_hash,
        s3_path,
      };
      db.query(connection,sql,values,(err,result) => {
        if (err && err.code === 'ER_DUP_ENTRY') {
          err = 'dup_ver';
        } else if (err) {
          util.errorLog("_postAppVer: insert ver err:",err);
        } else {
          app_ver_id = result.insertId;
        }
        done(err);
      });
    },
    done => {
      async.eachSeries(file_keys,(key,done) => {
        const file = req.files[key];
        const opts = {
          connection,
          app_ver_id,
          file,
        };
        _uploadFile(opts,done);
      },done);
    },
    done => {
      db.commit(connection,err => {
        if (err) {
          util.errorLog("_postAppVer: commit err:",err);
        }
        done(err);
      });
    }
  ],
  err => {
    if (err) {
      db.rollback(connection);
      if (err === 'dup_ver') {
        res.status(409).send("Duplicate version");
      } else {
        res.sendStatus(500);
      }
    } else {
      res.send({ app_ver_id });
    }
    util.unlinkFiles(req.files);
  });
}

function _uploadFile(opts,done) {
  const {
    connection,
    app_ver_id,
    file,
  } = opts;

  const {
    path,
    name,
    type,
  } = file;

  let file_contents;
  async.series([
    done => {
      fs.readFile(path,'utf8',(err,body) => {
        if (err) {
          util.errorLog("_uploadFile: readfile err:",err);
        }
        file_contents = body;
        done(err);
      });
    },
    done => {
      const sql = "INSERT INTO app_resource SET ?";
      const values = {
        app_ver_id,
        filename: name,
        content_type: type,
        file_contents,
      };
      db.query(connection,sql,values,err => {
        if (err) {
          util.errorLog("_uploadFile: sql err:",err);
        }
        done(err);
      });
    },
  ],done);
}

function _validateUploadToken(req,res,next) {
  const upload_token = req.body && req.body.upload_token;
  if (!upload_token) {
    res.status(401).send("upload_token required");
  } else {
    const sql = `
SELECT app.*
FROM upload_token
JOIN app USING (app_id)
WHERE upload_token = ?
`;
    db.queryFromPool(sql,upload_token,(err,results) => {
      if (err) {
        util.errorLog("_validateUploadToken: sql err:",err);
        res.sendStatus(500);
      } else if (results.length === 0) {
        res.sendStatus(401);
      } else {
        req.app = _resultToApp(results[0]);
        next();
      }
    });
  }
}

function _resultToApp(result) {
  return {
    app_id: result.app_id,
    app_name: result.app_name,
  };
}