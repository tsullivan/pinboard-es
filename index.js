var request = require('request')
var parseString = require('xml2js').parseString;
var args = process.argv.slice(2);

if (Array.isArray(args) && args.length === 1) {
  var auth = args[0];
} else {
  console.error('Usage: node index.js authuser:authtoken');
  process.exit();
}


var options = {
  uri: 'https://api.pinboard.in/v1/posts/all',
  qs: {
    auth_token: auth
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
