var thePackage = require('./package');
var request = require('request')
var _ = require('lodash')
var parseString = require('xml2js').parseString;
var elasticsearch = require('elasticsearch');
var program = require('commander');
var colors = require('colors/safe');

var updateCount = 25;
var docType = 'pinboard-posts'

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


function createDocumentsBody(result) {
  // parse result body into docs
  var lastFetched = new Date(result.posts.$.dt);
  var body = result.posts.post.map(function (doc) {
    return doc.$;
  }).map(function (doc) {
    return {
      href: doc.href,
      time: new Date(doc.time),
      description: doc.description,
      extended: doc.extended,
      tags: doc.tag.split(' '),
      lastFetched: lastFetched
    };
  });

  return _.flatten(body.map(function (doc) {
    return [ { index: { _id: doc.id }}, doc ];
  }));
}

function createClient(host) {
  return new elasticsearch.Client({
    apiVersion: '2.0',
    host: host // , log: 'trace'
  });
}

function createMapping(client) {
  var mappingBody = {};
  mappingBody[docType] = {
    properties: {
      href: { type: 'string', index: 'not_analyzed' },
      time: { type: 'date' },
      lastFetched: { type: 'date' }
    }
  };
  return client.indices.putMapping({
    index: '*',
    type: docType,
    body: mappingBody
  });
}

function bulkIndex(client, index, body) {
  return client.bulk({
    index: index,
    type: docType,
    body: body
  });
}

request(options, function (err, response) {
  if (err) {
    return console.error(colors.red('Request Error!\n'), err);
  }

  parseString(response.body, function (err, result) {
    var posts = _.get(result, 'posts.post');

    if (err || !posts) {
      return console.error(colors.red('Parse Error!\n'), err || 'posts: ' + posts);
    }

    // success!
    var indexSplit = program.index.match(/^(.*)(\/)(\w+)$/);
    var host = indexSplit[1];
    var index = indexSplit[3];
    var client = createClient(host);

    function bulk () {
      bulkIndex(client, index, createDocumentsBody(result)).then(function (result) {
        console.log(colors.green('Success!\n'));
      });
    }

    if (program.init) {
      createMapping(client).then(bulk);
    } else {
      bulk();
    }
  });
});
