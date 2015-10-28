var express = require('express');
var bodyParser = require('body-parser');
var Trello = require('node-trello');
var trello = new Trello(process.env.TRELLO_KEY, process.env.TRELLO_TOKEN);
var forAllAsync = exports.forAllAsync || require('forallasync').forAllAsync
    , maxCallsAtOnce = 4 // default
    , arr;

var app = express();
var port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));

function postToTrello(listId, command, text, user_name, cb) {
  if (text == undefined || text == null || text == "") {
    throw new Error('Format is ' + command + ' name | description(optional)');
  }

  var name_and_desc = text.split('|');

	var card_data = {
		'name' : name_and_desc.shift() + ' (@' + user_name + ')',
		'desc' : name_and_desc.shift()
	};

	trello.post('/1/lists/' + listId + '/cards', card_data, cb);
}

function postChecklistToTrello(listId, command, text, user_name, cb) {

    var name_and_desc = text.split('|');
    var checklist_data = {
        'name': name_and_desc.shift() + ' (@' + user_name + ')',
        'desc': name_and_desc.shift()
    };

    trello.post('/1/lists/' + listId + '/checklists', checklist_data, cb);
}

function postChecklistItemsToTrello(listId, command, text, user_name, cb) {

    var item_data = {
        'desc': text
    };
    trello.post('/1/lists/' + listId + 'checklists/checkItems', item_data, cb);
}

function listCheckItemsByCardName(query) {
    trello.get('/1/search/?query=' + query, function (err, data) {
        if (err) throw err;

        console.log(data);
        var cardId = data.cards[0].id
        trello.get('/1/cards/' + cardId + '?' + query, function (err, data) {
            if (err) throw err;
            console.log(data);

            var checklistids = data.idChecklists;
            var checklist = [];

            function onEach(complete, item, i) {
                trello.get('/1/checklists/' + item, function (err, data) {
                    if (err) throw err;
                    console.log(data);
                    var items = data.checkItems;
                    checklist.push(items);
                    complete();
                });
            }
            forAllAsync(checklistids, onEach, maxCallsAtOnce).then(function () {
                res.status(200).send(checklist);
            });
        });
        //res.status(200).send(data);
    });
}

app.post('/*', function(req, res, next) {
  var listId = req.params[0];
  var command = req.body.command,
  text = req.body.text,
  user_name = req.body.user_name;

  if (text.indexOf('add') != -1) {
      postToTrello(listId, command, text, user_name, function (err, data) {
          if (err) throw err;
          console.log(data);

          var name = data.name;
          var url = data.shortUrl;
          res.status(200).send('Card "' + name + '" created here: <' + url + '>');
      });
  }
  else if (text.indexOf('list') != -1) {
      listCheckItemsByCardName(text.replace(/list /gi, ""));
  }
  else {
      throw new Error('Format is ' + command + '[add,list] name | description)');
  }

  
});

// test route
app.get('/', function (req, res) { res.status(200).send('SupportKit.io loves Slack and Trello!') });

app.get('/list', function (req, res) {
    var i = req.url.indexOf('?');
    var query = req.url.substr(i + 1);
    trello.get('/1/lists/' + req.query.listid + '/cards' + '?' + query, function (err, data) {
        if (err) throw err;
        console.log(data);
        res.status(200).send(data);
    });
});



app.get('/search', function (req, res) {
    var i = req.url.indexOf('?');
    var query = req.url.substr(i + 1);
    listCheckItemsByCardName(query);
});

// error handler
app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.status(400).send('Error: ' + err.message);
});

app.listen(port, function () {
  console.log('Started Slack-To-Trello ' + port);
});
