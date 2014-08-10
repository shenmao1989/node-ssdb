var ssdb = require('./lib/ssdb');
var should = require('should');

var client = ssdb.Client();


// mocha ssdb module
describe('ssdb', function(){

  it('set', function(done) {
    client.set('k', 'v', function(err, val){
      should(err).eql(undefined);
      should(val).eql(1);
      done();
    });
  });

  it('get', function(done){
    client.set('k', 'v');
    client.get('k', function(err, val){
      should(err).eql(undefined);
      should(val).eql('v');
      done();
    });
  });

});
