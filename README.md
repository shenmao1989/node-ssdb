node-ssdb
---------

[ssdb](https://github.com/ideawu/ssdb) nodejs client library, 
ssdb is a fast nosql database, an alternative to redis.

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
var client = require('ssdb').Client();

client.set('key', 'val', function(err, data){
  if (!err) {
    console.log(data);
  } else throw err;
});
```

Documentation
--------------

Detail docs for this module can be found at: https://github.com/hit9/ssdb.api.docs

License
-------

[LICENSE-MIT](./LICENSE-MIT)
