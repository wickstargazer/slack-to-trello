var express = require('express');
var bodyParser = require('body-parser');
var Trello = require('node-trello');
var trello = new Trello(process.env.TRELLO_KEY, process.env.TRELLO_TOKEN);

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

app.post('/*', function(req, res, next) {
  var listId = req.params[0];
  var command = req.body.command,
  text = req.body.text,
  user_name = req.body.user_name;

  postToTrello(listId, command, text, user_name, function(err, data) {
    if (err) throw err;
    console.log(data);

    var name = data.name;
    var url = data.shortUrl;
    res.status(200).send('Card "' + name + '" created here: <' + url + '>');
  });
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
    trello.get('/1/search/?' + query, function (err, data) {
        if (err) throw err;
        console.log(data);

        var cardId = data.cards[0].id

        trello.get('/1/cards/' + cardId + '?' + query, function (err, data) {
            if (err) throw err;
            console.log(data);

            var checklistids = data.idChecklists;
            var checklist = [];
            for (var i = 0; i < checklistids.length; i++) {
                var request = require('sync-request');
                var res = request('GET', '/1/checklists/' + checklistids[i]);
                console.log(res);
                var items = res.checkItems;
                checklist.push(items);
            }
            res.status(200).send(checklist);
            
        });

        //res.status(200).send(data);
    });
});

// error handler
app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.status(400).send('Error: ' + err.message);
});

app.listen(port, function () {
  console.log('Started Slack-To-Trello ' + port);
});
