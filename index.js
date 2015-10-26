var rp = require('request-promise')
var parseString = require('xml2js').parseString;
var args = process.argv.slice(2);

if (Array.isArray(args) && args.length === 1) {
  var auth = args[0];
} else {
  console.err('Usage: node index.js authuser:authtoken');
}


var options = {
  uri: 'https://api.pinboard.in/v1/posts/all',
  qs: {
    auth_token: auth
  },
  headers: {
    'User-Agent': 'Request-Promise'
  }
};

rp(options)
  .then(function (xml) {
    parseString(xml, function (err, result) {
      if (err) console.err('Error!', err);
      console.log(JSON.stringify(result));
    });
  });
