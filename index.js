var thePackage = require('./package');
var rp = require('request-promise')
var _ = require('lodash')
var Promise = require('bluebird');
var parseXmlString = Promise.promisify(require('xml2js').parseString);
var elasticsearch = require('elasticsearch');
var program = require('commander');
var colors = require('colors/safe');

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

var indexSplit = program.index.match(/^(.*)(\/)(\w+)$/);
if (_.isNull(indexSplit)) {
  console.error(colors.red(
    'Invalid format for the index param!\n' +
    'Format is: http://shielduser:shieldpass@localhost:9200/pinboard'
  ));
  process.exit();
}
var programHostUri = indexSplit[1];
var programIndexName = indexSplit[3];
var programTypeName = 'posts'

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

function createClient() {
  return new elasticsearch.Client({
    apiVersion: '2.1',
    host: programHostUri // , log: 'trace'
  });
}

function putTemplate(client) {
  return client.indices.putTemplate({
    name: 'pinboard',
    body: require('./pinboard_mapping.json')
  });
}

function bulkIndex(client, body) {
  return client.bulk({
    index: programIndexName,
    type: programTypeName,
    body: body
  });
}

rp(options)
.then(function (response) {
  parseXmlString(response)
  .then(function (result) {
    var posts = _.get(result, 'posts.post');
    var client = createClient();

    function bulk () {
      bulkIndex(client, createDocumentsBody(result))
      .then(function (result) {
        console.log(colors.green('Success!'));
      })
      .catch(function (err) {
        console.error(colors.red('Failure for bulk index!\n', err));
      });
    }

    if (program.init) {
      putTemplate(client)
      .then(bulk)
      .catch(function (err) {
        console.error(colors.red('Failure for creating the template!\n', err));
      });
    } else {
      bulk();
    }
  })
  .catch(function (err) {
    return console.error(colors.red('Parse Error!\n'), err);
  });
})
.catch(function (err) {
  return console.error(colors.red('Request Error!\n'), err);
});
