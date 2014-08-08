// nodejs client for https://github.com/ideawu/ssdb
//
// Usage:
//
//   > ssdb = require('ssdb')
//   > client = ssdb.Client()
//   > client.set('key', 'val')
//   > client.get('key')


var net = require('net');
var util = require('util');


var toInt = function(val) {return parseInt(val)};
var toBool = function(val) {return !!toInt(val)};
var toFloat = function(val) {return parseFloat(val)};
var toString = function(val) {return val};


conversions = {
  int: toInt,
  bool: toBool,
  float: toFloat,
  string: toString
}


function Connection(port, host, timeout, connectListener, timeoutCallback) {
  this.host = host || '0.0.0.0';
  this.port = port || 8888;
  this.timeout = timeout || 0;
  this.connectListener = connectListener;
  this.timeoutCallback = timeoutCallback;

  this.sock = null;
  this.batch = false;
  this.callbacks = [];
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


Connection.prototype.parse = function(buf) { // parse responsed buffer
  var i = 0;
  var resps = [];
  var data = buf.toString();

  var parseUnit = function() {  // parse an unit, like `'2\nok\n'`
    var buf = '';
    for (; data[i] != '\n'; buf += data[i++]);

    if (buf !== '') {
      var size = parseInt(buf);
      var unit = data.slice(i + 1, (i + 1) + size);
      i += size + 1;
      i++;  // a unit ends with a '\n'
      return unit;
    }
    return null;
  }

   while (i < data.length) {
    var resp = [];
    var stat = parseUnit();  // response status
    resp.push(stat);

    while (1) {
      var body = parseUnit();  // response body
      if (body === null) break;
      resp.push(body);
    }

    resps.push(resp);
    i++;  // each response ends with a '\n'
  }

  return resps;
}


Connection.prototype.compile = function(cmd, params) {  // build command buffer
  var args = [];
  var list = [];
  var pattern = '%d\n%s\n';

  args.push(cmd);
  Array.prototype.push.apply(args, params);

  for(var i = 0; i < args.length; i++) {
    var arg = args[i];
    list.push(util.format(pattern, arg.toString().length, arg));
  }

  list.push('\n');
  return list.join('');
}


Connection.prototype.buildValue = function() {
  //
}


Connection.prototype.send = function(cmd, params) {
  if (!this.sock) this.connect();
  var buffer = new Buffer(this.compile(cmd, params));
  return this.sock.write(buffer);
}


Connection.prototype.onrecv = function(buf) {
  var resps = this.parse(buf);
  var callbacks = this.callbacks;
  resps.forEach(function(resp){
    var callback = callbacks.shift();
    callback(resp);
  });
}


Connection.prototype.request = function(cmd, params, callback) {
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
}


Client.prototype.quit = function() {
  return this.conn.close();
}


exports.Client = Client
exports.Connection = Connection
