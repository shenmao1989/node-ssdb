var util = require('util');
var ssdb = require('./lib/ssdb');
var should = require('should');
var co = require('co');
var sleep = require('co-sleep');

var client = ssdb.createClient();
client.thunkify();

// helpers
var uk = (function(base){
  var cursor = base;
  return function(prefix){
    prefix = prefix || 'key';
    return util.format('%s-%d', prefix, cursor++);
  };
})(new Date().getTime());


// mocha ssdb module
describe('ssdb', function(){

  it('set', function(done){
    co(function*(){
      var key = uk();
      var d = yield client.set(key, 'v');
      should(d).eql(1);
      done();
    })();
  });

  it('setx', function(done){
    co(function*(){
      var key = uk();
      var d = yield client.setx(key, 'v', 1.2);
      var ttl = yield client.ttl(key);
      yield sleep(1201);
      var b = yield client.exists(key);
      should(d).eql(1)
      should(ttl).below(1.2);
      should(b).be.false;
      done();
    })();
  });

  it('expire', function(done){
    co(function*(){
      var key = uk();
      var a = yield client.set(key, 'v');
      var b = yield client.expire(key, 1.2);
      var c = yield client.ttl(key);
      var d = yield client.expire(uk(), 1.1);
      should(a).eql(1);
      should(b).eql(1);
      should(c).below(1.2);
      should(d).eql(0);
      done();
    })();
  });

  it('ttl', function(done){
    co(function*(){
      var key = uk();
      var a = yield client.setx(key, 'v', 1.2);
      var b = yield client.ttl(key);
      should(a).eql(1);
      should(b).not.below(0);
      should(b).below(1.2);
      done();
    })();
  });

  it('setnx', function(done){
    co(function*(){
      var key = uk();
      var a = yield client.setnx(key, 'v');
      var b = yield client.setnx(key, 'v');
      should(a).eql(1);
      should(b).eql(0);
      done();
    })();
  });

  it('get', function(done){
    co(function*(){
      var key = uk();
      yield client.set(key, 'v');
      var d = yield client.get(key);
      should(d).eql('v');
      done();
    })();
  });

  it('getset', function(done){
    co(function*(){
      var key = uk();
      var a = yield client.set(key, 'v');
      var b = yield client.getset(key, 'val');
      should(a).eql(1);
      should(b).eql('v');
      done();
    })();
  });

  it('del', function(done){
    co(function*(){
      var key = uk();
      var a = yield client.set(key, 'v');
      var b = yield client.del(key);
      var c = yield client.exists(key);
      should([a, b, c]).eql([1, 1, false]);
      done();
    })();
  });

  it('incr', function(done){
    co(function*(){
      var key = uk();
      var a = yield client.set(key, 1);
      var b = yield client.incr(key, 2);
      var c = yield client.get(key);
      should([a, b, c]).eql([1, 3, 3]);
      done();
    })();
  });

  it('exists', function(done){
    co(function*(){
      var key = uk();
      var a = yield client.set(key, 1);
      var b = yield client.exists(key);
      var c = yield client.exists(uk());
      should([a, b, c]).eql([1, true, false]);
      done();
    })();
  });

  it('getbit', function(done){
    co(function*(){
      var key = uk();
      var a = yield client.set(key, 'val');
      var b = yield client.getbit(key, 2);
      should([a, b]).eql([1, 1]);
      done();
    })();
  });

  it('setbit', function(done){
    co(function*(){
      var key = uk();
      var a = yield client.set(key, 'val');
      var b = yield client.setbit(key, 2, 0);
      var c = yield client.get(key);
      should([a, b, c]).eql([1, 1, 'ral']);
      done();
    })();
  });

  it('countbit', function(done){
    co(function*(){
      var key = uk();
      var a = yield client.set(key, 'val');
      var b = yield client.countbit(key);
      should([a, b]).eql([1, 8]);
      done();
    })();
  });

  it('substr', function(done){
    co(function*(){
      var key = uk();
      var a = yield client.set(key, 'hello world');
      var b = yield client.substr(key);
      var c = yield client.substr(key, 6, 10);
      should([a, b, c]).eql([1, 'hello world', 'world']);
      done();
    })();
  });

  it('strlen', function(done){
    co(function*(){
      var key = uk();
      var a = yield client.set(key, 'hello world');
      var b = yield client.strlen(key);
      should([a, b]).eql([1, 11]);
      done();
    })();
  });

  it('keys', function(done){
    co(function*(){
      var start = uk();
      var a = uk(); var b = uk();
      yield client.set(a, 1);
      yield client.set(b, 1);
      d = yield client.keys(start, uk(), 2);  // (start, end]
      should(d).eql([a, b]);
      done();
    })();
  });

  it('scan', function(done){
    co(function*(){
      var start = uk();
      var a = uk(); var b = uk();
      yield client.set(a, 1);
      yield client.set(b, 1);
      d = yield client.scan(start, uk(), -1);  // (start, end]
      should(d).eql([a, 1, b, 1]);
      done();
    })();
  });

  it('rscan', function(done){
    co(function*(){
      var stop = uk();
      var a = uk(); var b = uk();
      yield client.set(a, 1);
      yield client.set(b, 1);
      var start = uk();
      var d = yield client.rscan(start, stop, -1);  // (start, end]
      should(d).eql([b, 1, a, 1]);
      done();
    })();
  });

  it('multi_set/multi_get/multi_del', function(done){
    co(function*(){
      var k1 = uk();
      var k2 = uk();
      var k3 = uk();
      var a = yield client.multi_set(k1, 'v1', k2, 'v2', k3, 'v3');
      var b = yield client.multi_get(k1, k2, k3);
      var c = yield client.multi_del(k1, k2, k3);
      should([a, c]).eql([3, 3]);
      should(b).eql([k1, 'v1', k2, 'v2', k3, 'v3']);
      done();
    })();
  });

  it('hset/hget/hdel/hincr/hexists', function(done){
    co(function*(){
      var hash = uk('hash');
      var field = uk('field');
      var a = yield client.hset(hash, field, 'v');
      var b = yield client.hget(hash, field);
      var c = yield client.hdel(hash, field);
      var d = yield client.hincr(hash, field, 3);
      var e = yield client.hexists(hash, field)
      should([a, b, c, d, e]).eql([1, 'v', 1, 3, true]);
      done();
    })();
  });

  it('hexists', function(done){
    co(function*(){
      var hash = uk('hash');
      var field = uk('field');
      var d = client.hexists(hash, field);
      should(yield d).eql(false);
      done();
    })();
  });

  it('hsize', function(done){
    co(function*(){
      var hash = uk('hash');
      var d = [];
      for (var i = 0; i < 10; i++) {
        d.push(client.hset(hash, uk('field'), 'v'));
      }
      yield d;
      should(yield client.hsize(hash)).eql(10);
      done();
    })();
  });

  it('hlist/hrlist', function(done){
    co(function*(){
      var start = uk('hash');
      var a = uk('hash');
      var b = uk('hash');
      yield client.hset(a, 'field', 'v');
      yield client.hset(b, 'field', 'v');
      var lst = yield client.hlist(start, uk('hash'), -1);
      var rlst = yield client.hrlist(uk('hash'), start, -1);
      should(lst).eql([a, b]);
      should(rlst).eql([b, a]);
      done();
    })();
  });

  it('hkeys/hscan/hrscan/hgetall/hclear', function(done){
    co(function*(){
      var h = uk('hash');
      var a = uk('field');
      var b = uk('field');
      yield client.hset(h, a, 'va');
      yield client.hset(h, b, 'vb');
      var keys = yield client.hkeys(h, '', '', -1);
      var scan = yield client.hscan(h, '', '', -1);
      var rscan = yield client.hrscan(h, '', '', -1);
      var all = yield client.hgetall(h, '', '', -1);
      var nums = yield client.hclear(h);
      should(keys).eql([a, b]);
      should(scan).eql([a, 'va', b, 'vb']);
      should(rscan).eql([b, 'vb', a, 'va']);
      should(all).eql([a, 'va', b, 'vb']);
      should(nums).eql(2);
      should(yield client.hsize(h)).eql(0);
      done();
    })();
  });

});
