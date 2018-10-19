'use strict';

const _ = require('lodash');
const async = require('async');
const mysql = require('mysql');

const MYSQL_TIMEOUT_MS = 30*1000;

let db_config;
let db_pool;

exports.init = init;
exports.db_pool = db_pool;
exports.connectionFromPool = connectionFromPool;
exports.queryWithArgMapFromPool = queryWithArgMapFromPool;
exports.queryWithArgMap = queryWithArgMap;
exports.queryFromPool = queryFromPool;
exports.queryFromPoolWithConnection = queryFromPoolWithConnection;
exports.release = release;
exports.rollback = rollback;
exports.commit = commit;
exports.query = query;
exports.lockedFunction = lockedFunction;
exports.tryLock = tryLock;
exports.releaseLock = releaseLock;
exports.chunkQuery = chunkQuery;

function init(params) {
  db_config = _.extend({},params);
  db_config.multipleStatements = true;
  db_config.timezone = 'UTC';
  db_config.debug = false;
  db_config.charset = 'utf8mb4';

  db_pool =  mysql.createPool(db_config);
}

function connectionFromPool(callback) {
  db_pool.getConnection(function(err,connection) {
    if (err) {
      callback(err);
    } else {
      callback(null,connection);
    }
  });
}

function queryWithArgMapFromPool(sql,arg_values,callback)
{
  connectionFromPool(function(err,connection) {
    if (err) {
      callback(err);
    } else {
      queryWithArgMap(connection,sql,arg_values,function(err,results) {
        try {
          connection.release();
        } catch (e) {
          console.error("Release exception: " + e);
        }
        callback(err,results);
      });
    }
  });
}

function queryWithArgMap(connection,opts,arg_values,callback)
{
  if( typeof opts != 'object' ) {
    opts = {
      sql: opts,
    };
  }

  var needle_list = _.map(arg_values,function(val,key){ return ":" + key; });
  var regex = new RegExp(needle_list.join("|"),'g');
  var match_list = opts.sql.match(regex);
  var values = _.map(match_list,function(val) {
    var key = val.slice(1);
    return arg_values[key];
  });
  opts.sql = opts.sql.replace(regex,"?");
  if (db_config.debug) {
    console.log("queryWithArgMap sql:",opts.sql);
  }

  query(connection,opts,values,callback);
}

function queryFromPool(sql,values,callback) {
  if (typeof values === 'function') {
    callback = values;
    values = [];
  }

  queryFromPoolWithConnection(sql,values,function(err,results,connection) {
    try {
      connection.release();
    } catch (e) {
      console.error("Release exception: " + e);
    }
    callback(err,results);
  });
}

function queryFromPoolWithConnection(sql,values,callback) {
  if (typeof values === 'function') {
    callback = values;
    values = [];
  }

  db_pool.getConnection(function(err, connection) {
    if( err )
    {
      callback(err);
    }
    else
    {
      query(connection,sql,values,function(err, results)
      {
        callback(err,results,connection);
      });
    }
  });
}

function release(connection) {
  if (connection) {
    try {
      connection.release();
    } catch (e) {
      console.error("Release exception:",e);
    }
  }
}

function rollback(connection,done)
{
  if( !done )
  {
    done = function() {};
  }

  if( connection )
  {
    query(connection,"ROLLBACK",[],function(err)
    {
      try
      {
        connection.release();
      }
      catch( e )
      {
        console.error("Release exception:",e);
      }
      done(err);
    });
  }
  else
  {
    done();
  }
}
function commit(connection,done)
{
  if( !done )
  {
    done = function() {};
  }
  if( connection )
  {
    query(connection,"COMMIT",[],function(err)
    {
      try
      {
        connection.release();
      }
      catch( e )
      {
        console.error("Release exception: " + e);
      }
      done(err);
    });
  }
  else
  {
    done();
  }
}

function query(connection,opts,values,callback)
{
  if( typeof values === 'function' )
  {
    callback = values;
    values = [];
  }
  if( typeof opts != 'object' )
  {
    opts = {
      sql: opts,
    };
  }

  if( !opts.timeout )
  {
    opts.timeout = MYSQL_TIMEOUT_MS;
  }
  connection.query(opts,values,callback);
}

function lockedFunction(lock_name,func,all_done)
{
  var connection = false;
  async.series([
    function(done)
    {
      var sql = "SELECT GET_LOCK(?,0) AS lock_result";
      queryFromPoolWithConnection(sql,lock_name,function(err,results,new_conn)
      {
        connection = new_conn;
        if( !err )
        {
          if( results.length == 0 )
          {
            err = 'lock_failed';
          }
          else if( results[0].lock_result == 0 )
          {
            err = 'lock_contend';
          }
          else if( results[0].lock_result != 1 )
          {
            err = 'lock_failed';
          }
        }
        done(err);
      });
    },
    function(done)
    {
      func(done);
    }],
  function(err)
  {
    if( connection )
    {
      var sql = "SELECT RELEASE_LOCK(?)";
      query(connection,sql,lock_name,function()
      {
        release(connection);
        all_done(err);
      });
    }
  });
}

const g_lock_connection_map = {};
function tryLock(lock_name,done) {
  if (lock_name in g_lock_connection_map) {
    throw "lock already locked: " + lock_name;
  }
  g_lock_connection_map[lock_name] = false;

  const sql = "SELECT GET_LOCK(?,0) AS lock_result";
  queryFromPoolWithConnection(sql,lock_name,(err,results,conn) => {
    if (!err) {
      if (results.length == 0) {
        err = 'lock_failed';
      } else if (results[0].lock_result == 0) {
        err = 'lock_contend';
      } else if (results[0].lock_result != 1) {
        err = 'lock_failed';
      }
    }
    if (err) {
      release(conn);
      delete g_lock_connection_map[lock_name];
    } else {
      g_lock_connection_map[lock_name] = conn;
    }
    done(err);
  });
}

function releaseLock(lock_name,done) {
  if (lock_name in g_lock_connection_map) {
    const conn = g_lock_connection_map[lock_name];
    const sql = "SELECT RELEASE_LOCK(?)";
    query(conn,sql,lock_name,(err) => {
      release(conn);
      delete g_lock_connection_map[lock_name];
      done(err);
    });
  } else {
    done('not_locked');
  }
}

function chunkQuery(sql,rows,each_limit,done) {
  const temp_list = rows.slice();

  const chunks = [];
  while (temp_list.length > 0) {
    chunks.push(temp_list.splice(0,each_limit));
  }

  async.eachSeries(chunks,
    (chunk,done) => {
      queryFromPool(sql,[chunk],done);
    },
    done);
}
