'use strict';

const AWS = require('aws-sdk');
const async = require('async');
const express = require('express');
const path_join = require('path').join;
const s3UrlParse = require("amazon-s3-uri");

const app_renderer = require('../../app_renderer.js');
const site_manager = require('../../site_manager.js');
const util = require('../../tools/util.js');
const mainModule = require('../../index.js');

const router = new express.Router();
exports.router = router;

router.all('/1/publish_site/:site_id',_publishSite);

function _publishSite(req,res) {
  res.header('Cache-Control',"no-cache, no-store, must-revalidate");
  const site_id = req.params.site_id;

  if (!mainModule.getConfig('allow_publish')) {
    res.status(403).send("Publish not allowed by config");
  } else {
    let published_paths = [];
    let site_data;
    async.series([
      done => {
        site_manager.getAllSitePaths(site_id,(err,data) => {
          if (!err && !data.site && data.site.s3_publish_url) {
            err = 'no_s3_url';
          }
          site_data = data;
          done(err);
        });
      },
      done => {
        const { site, path_list } = site_data;
        const { region, bucket, key } = s3UrlParse(site.s3_publish_url);
        const s3_opts = {};
        if (region) {
          s3_opts.region = region;
        }
        const s3 = new AWS.S3(s3_opts);
        async.eachSeries(path_list,(path_data,done) => {
          const opts = {
            s3,
            bucket,
            site,
            path_data,
            key_prefix: key || "",
          };
          _publishSitePath(opts,(err,s3_key) => {
            if (!err && s3_key) {
              published_paths.push({ path: path_data.path, s3_key });
            }
            done(err);
          });
        },done);
      }],
      err => {
        if (err) {
          res.status(500).send({ err });
        } else {
          res.send(published_paths);
        }
      }
    );
  }
}

function _publishSitePath(params,done) {
  const {
    s3,
    bucket,
    site,
    path_data,
    key_prefix,
  } = params;
  const {
    path,
    site_path,
    app_resource,
    app,
    app_ver,
  } = path_data;
  const site_data = {
    site,
    site_path,
    app_resource,
    app,
    app_ver,
  };

  if (path[0] === '/') {
    const { content_type, body, } = app_renderer.render(site_data);

    const rest = path === '/' ? "index.html" : path.slice(1);
    const key = path_join(key_prefix,rest);
    const opts = {
      ACL: 'public-read',
      Bucket: bucket,
      Body: body,
      ContentType: content_type,
      CacheControl: "public, max-age=60",
      Key: key,
    };
    s3.putObject(opts,err => {
      if (err) {
        util.errorLog("publish._publishSitePath: putObject err:",err);
      }
      done(err,key);
    });
  } else {
    done();
  }
}
