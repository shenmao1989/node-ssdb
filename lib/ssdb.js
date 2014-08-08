// nodejs client for https://github.com/ideawu/ssdb
// example
//
//   var client = new require('ssdb').Client()
//   client.set('key', 'val', function(err, resp){
//     if (!err) {
//        console.log(resp);
//     } else throw err;
//   })


var net = require('net');
var util = require('util');


conversions = {  // cast responsed strings to js types
  int: parseInt,
  float: parseFloat,
  str: function(val){ return val },
  bool: function(val) {return !!parseInt(val)},
}


commands = {
  set: 'int',
  setx: 'int',
  expire: 'int',
  ttl: 'int',
  setnx: 'int',
  get: 'str',
  getset: 'str',
  del: 'int',
  incr: 'int',
  exists: 'bool',
  getbit: 'int',
  setbit: 'int',
  countbit: 'int',
  substr: 'str',
  strlen: 'int',
  keys: 'list',
  scan: 'list',
  rscan: 'list',
  multi_set: 'int',
  multi_get: 'list',
  multi_del: 'int',
  hset: 'int',
  hget: 'str',
  hdel: 'int',
  hincr: 'int',
  hexists: 'bool',
  hsize: 'int',
  hlist: 'list',
  hrlist: 'list',
  hkeys: 'list',
  hgetall: 'list',
  hscan: 'list',
  hrscan: 'list',
  hclear: 'int',
  multi_hset: 'int',
  multi_hget: 'list',
  multi_hdel: 'int',
  zset: 'int',
  zget: 'int',
  zdel: 'int',
  zincr: 'int',
  zexists: 'bool',
  zsize: 'int',
  zlist: 'list',
  zrlist: 'list',
  zkeys: 'list',
  zscan: 'list',
  zrscan: 'list',
  zrank: 'int',
  zrrank: 'int',
  zrange: 'list',
  zrrange: 'list',
  zclear: 'int',
  zcount: 'int',
  zsum: 'int',
  zavg: 'float',
  zremrangebyrank: 'int',
  zremrangebyscore: 'int',
  multi_zset: 'int',
  multi_zget: 'list',
  multi_zdel: 'int',
  qsize: 'int',
  qclear: 'int',
  qfront: 'str',
  qback: 'str',
  qget: 'str',
  qslice: 'list',
  qpush: 'str',
  qpush_front: 'int',
  qpush_back: 'int',
  qpop: 'str',
  qpop_front: 'str',
  qpop_back: 'str',
  qlist: 'list',
  qrlist: 'list',
  info: 'list'
}


function ResponseParser() {
  this.cursor = 0;
  this.data = '';
}


ResponseParser.prototype.parse = function(buf) {
  var responses = [];

  this.data = buf.toString();
  this.cursor = 0;

  while (this.cursor < this.data.length) {
    var response = [];
    response.push(this.parseUnit());  // response status

    while (1) {
      var body = this.parseUnit();  // response body
      if (body === null) break;
      else response.push(body);
    }

    responses.push(response);
    this.cursor++;
  }
  return responses;
}

ResponseParser.prototype.parseUnit = function () {  // parse unit like '2\nok\n'
  var str = '';

  for (; this.data[this.cursor] !== '\n'; str += this.data[this.cursor++]);

  if (str !== '') {
    var size = parseInt(str);
    var unit = this.data.slice(this.cursor + 1, (this.cursor + 1) + size);
    this.cursor += size + 1;
    this.cursor++ ;  // unit ends with '\n'
    return unit;
  }

  return null;
}


function Connection(port, host, timeout, connectListener, timeoutCallback) {
  this.host = host || '0.0.0.0';
  this.port = port || 8888;
  this.timeout = timeout || 0;
  this.connectListener = connectListener;
  this.timeoutCallback = timeoutCallback;

  this.sock = null;
  this.callbacks = [];
  this.commands = [];
  this.parser = new ResponseParser()
}


Connection.prototype.connect = function() {
  this.sock = net.Socket();
  this.sock.setTimeout(this.timeout, this.timeoutCallback);
  this.sock.setEncoding('utf8');
  this.sock.setNoDelay(true);
  this.sock.setKeepAlive(true);
  var self = this;
  this.sock.on('data', function(buf){ return self.onrecv(buf)});
  this.sock.connect(this.port, this.host, this.connectListener);
}


Connection.prototype.close = function() {
  if (this.sock) {
    this.sock.end();
    this.sock.destroy();
    this.sock = null;
  }
}


Connection.prototype.compile = function(cmd, params) {  // build command buffer
  var args = [];
  var list = [];
  var pattern = '%d\n%s\n';

  args.push(cmd);
  Array.prototype.push.apply(args, params);

  for(var i = 0; i < args.length; i++) {
    var arg = args[i];
    var bytes = Buffer.byteLength(util.format('%s', arg));
    list.push(util.format(pattern, bytes, arg));
  }

  list.push('\n');
  return new Buffer(list.join(''));
}


Connection.prototype.send = function(cmd, params) {
  if (!this.sock) this.connect();
  var buffer = this.compile(cmd, params);
  return this.sock.write(buffer);
}


Connection.prototype.buildValue = function(type, data) {
  switch(type) {
    case 'int':
    case 'str':
    case 'bool':
    case 'float':
      return conversions[type](data[0]);
    case 'list':
      return data;
  }
}


Connection.prototype.onrecv = function(buf) {
  var responses = this.parser.parse(buf);
  var callbacks = this.callbacks;
  var self = this;

  responses.forEach(function(response){
    var callback = callbacks.shift();
    var status = response[0];
    var data = response.slice(1);
    var command = self.commands.shift()
    
    if (status === 'ok') {
      var type = commands[command] || 'str';
      callback(null, self.buildValue(type, data));
    } else {
      var etpl = "ssdb: '%s' on command '%s'";
      var error = util.format(etpl, status, command);
      callback(error);
    }
  });
}


Connection.prototype.request = function(cmd, params, callback) {
  this.commands.push(cmd);
  this.callbacks.push(callback);
  this.send(cmd, params);
}


function Client(options) {
  this.conn = new Connection(
    options.port, 
    options.host,
    options.connectListener,
    options.timeoutCallback
  );

  var self = this;

  for (var key in commands) {
    (function(key){
      self[key] = function(){
        var params = Array.prototype.slice.call(arguments, 0, -1);
        var last = Array.prototype.slice.call(arguments, -1)[0];

        if (typeof(last) == 'function') {
          var callback = last;
        } else {
          var callback = function(){};
          params.push(last);
        }
        return self.conn.request(key, params, callback);
      }
    })(key);
  }
}


Client.prototype.quit = function() {
  return this.conn.close();
}


exports.Client = function(options) {return new Client(options || {})};
