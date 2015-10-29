var thePackage = require('./package');
var request = require('request')
var parseString = require('xml2js').parseString;
var elasticsearch = require('elasticsearch');
var program = require('commander');

var updateCount = 25;

program
  .version(thePackage.version)
  .option('--auth <auth>', 'Pinboard auth, e.g: <pinboardauthuser:pinboardauthtoken>')
  .option('--index <endpoint>', 'ES endpoint with index name, e.g: http://shielduser:shieldpass@localhost:9200/pinboard')
  .option('--init', 'Fetch all the pinboard posts')
  .option('--update', 'Fetch only the last ' + updateCount)
  .parse(process.argv);
  
if (!(program.auth && program.index)) {
  program.outputHelp();
  process.exit();
}

var uri = 'https://api.pinboard.in/v1/posts/';
if (program.init) {
  uri += 'all';
} else {
  uri += 'recent';
}

var options = {
  uri: uri,
  qs: {
    auth_token: program.auth,
    count: program.update ? updateCount : undefined
  },
  headers: {
    'User-Agent': 'Request'
  }
};

request(options, function (err, response) {
  if (err) {
    return console.error('Request Error!', err);
  }

  parseString(response.body, function (err, result) {
    if (err) {
      console.dir(response.body);
      return console.error('Parse Error!', err);
    }

    console.log('Success!', JSON.stringify(result));
  });
});
