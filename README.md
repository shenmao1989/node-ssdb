node-ssdb
---------

[ssdb](https://github.com/ideawu/ssdb) nodejs client library, 
ssdb is a fast nosql database, an alternative to redis.


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
