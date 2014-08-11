node-ssdb
=========

[ssdb](https://github.com/ideawu/ssdb) nodejs client library,
ssdb is a fast nosql database, an alternative to redis.

Latest version: v0.0.3 (Currently untested).

Requirements
-------------

- ssdb 1.6.8.8+

Installation
-------------

```bash
$ npm install ssdb
```

Example
--------

```js
var ssdb = require('ssdb');
var client = ssdb.createClient();

client.set('key', 'val', function(err, data){
  if (!err) {
    console.log(data);
  } else throw err;
});
```

API References
--------------

### createClient(options)

To make a ssdb client:

```js
var ssdb = require('ssdb');
var client = ssdb.createClient();
```

options (with default values):

```js
{
  host: '0.0.0.0',
  port: 8888,
  timeout: 0
}
```

### client.quit()

Quit from ssdb server.

### client.unref()

Equivalent to `client.conn.sock.unref()`, see http://nodejs.org/api/net.html#net_server_unref.

### Client events

#### 'status_ok'

- parameters: `cmd`, `data`

Listener example:
```js
var util = require('util');

client.on('status_ok', function(cmd, data){
  console.log(util.format('%s replies ok, data: %s', cmd, data));
});
```

#### 'status_not_found'

- parameters: `cmd`

#### 'status_client_error'

- parameters: `cmd`

#### 'status_not_ok'

- parameters: `status`, `cmd`

### Connection Events Handling

The node connection object is `client.conn.sock`, to listen connection error as an example:

```js
client.conn.sock.on('error', function(err){
  throw err;
});
```

Connection events reference: http://nodejs.org/api/net.html

### commands

All command names are keys of the object `ssdb.commands`, to loop over all command methods:

```js
for (var cmd in ssdb.commands) {
    var method = client[cmd];
}
```

Work with Co
------------

To work with TJ's [co](https://github.com/visionmedia/co), we
should make these command methods yieldable:

```js
for (cmd in ssdb.commands) {
  (function(cmd){
    var _ = client[cmd];
    client[cmd] = function(){
      var args = arguments;
      return function(cb){
        [].push.call(args, cb);
        _.apply(this, args);
      };
    };
  })(cmd);
}
```

then, here is an example:

```js
var co = require('co');

co(function *(){
  var key = 'k';
  try{
    var a = yield client.set(key, 'v');
    var b = yield client.get(key);
    console.log(a, b);
  } catch(e){
    throw e;
  }
})();
```

Work with Promise
-----------------

At first, promisify all commands (via [q](https://github.com/kriskowal/q)
for an example):

```js
var Q = require('q');
var ssdb = require('ssdb');

var client = ssdb.createClient();

for (cmd in ssdb.commands) {
  client[cmd] = q.denodeify(client[cmd]);
}
```

then you can use `ssdb` the `promise` way:

```js
client.set('k', 'v')
.then(function(d){
  console.log('set reply:', d);  // 1
})
.then(function(){
  return client.get('k');  // 'v'
})
.then(function(d){
  console.log('get reply', d);
})
.catch(function(e){
  throw e;
})
.done();
```

SSDB API Documentation
----------------------

Detail docs for ssdb interfaces can be found at: https://github.com/hit9/ssdb.api.docs

License
-------

[LICENSE-MIT](./LICENSE-MIT)
