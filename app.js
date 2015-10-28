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

function postChecklistItemsToTrello(query, text, user_name, res) {

    var item_data = {
        'name': text + ' (@' + user_name + ')'
    };

    trello.get('/1/search/?query=' + query, function (err, data) {

        if (err) throw err;

        var cardId = data.cards[0].id
        trello.get('/1/cards/' + cardId, function (err, data) {
            if (err) throw err;
            var checklistids = data.idChecklists;
            trello.post('/1/checklists/' + checklistids[0] + '/checkItems', item_data, function (err, data) {
                if (err) throw err;
                console.log(data);

                var name = data.name;
                var url = data.shortUrl;
                res.status(200).send('Item "' + name + '" created under card: <' + query + '>');
            });
        });
       
    });


}

function listCheckItemsByCardName(query, res) {
    trello.get('/1/search/?query=' + query, function (err, data) {
        
        if (err) throw err;
        var cardId = data.cards[0].id
        trello.get('/1/cards/' + cardId, function (err, data) {
            if (err) throw err;
            var checklistids = data.idChecklists;
            var checklist = [];

            function onEach(complete, item, i) {
                trello.get('/1/checklists/' + item, function (err, data) {
                    if (err) throw err;
                   
                    var items = data.checkItems;
                    var stringoutput = "";
                    for (var i in items) {
                        var val = items[i];
                        if (val.state != 'complete') {
                            stringoutput = val.name + ":" + val.state + ":" + val.id;
                            checklist.push(stringoutput);
                        }
                    }
                    complete();
                });
            }
            forAllAsync(checklistids, onEach, maxCallsAtOnce).then(function () {
                res.status(200).send(checklist.toString().replace(/,/g, "\n"));
            });
        });
    });
}

app.post('/*', function(req, res, next) {
  var listId = req.params[0];
  var command = req.body.command,
  text = req.body.text,
  user_name = req.body.user_name;
  if (req.body.token != "KCNb3KKJPg7VN3YK1OCE09SH") {
    res.status(200).send('Invalid Token in request!!');
  }
  if (text.lastIndexOf('add', 0) === 0) {
      var pos = text.indexOf('to');
      if (pos == -1) {
          res.status(200).send('Usage is ' + command + ' add description to card name)');
      }
      var cardname = text.substring(pos + 1);
      text = text.substring(0, pos != -1 ? pos : text.length);
      postChecklistItemsToTrello(cardname, text.substr(4), user_name, res);
  }
  else if (text.lastIndexOf('list', 0) === 0) {
      listCheckItemsByCardName(text.substr(5) ,res);
  }
  else {
      res.status(200).send('Format is ' + command + ' [add,list] name | description)');
  }

  
});

// test route
app.get('/', function (req, res) { res.status(200).send('SupportKit.io loves Slack and Trello!') });

//app.get('/list', function (req, res) {
//    var i = req.url.indexOf('?');
//    var query = req.url.substr(i + 1);
//    trello.get('/1/lists/' + req.query.listid + '/cards' + '?' + query, function (err, data) {
//        if (err) throw err;
//        console.log(data);
//        res.status(200).send(data);
//    });
//});



//app.get('/search', function (req, res) {
//    var i = req.url.indexOf('?');
//    var query = req.url.substr(i + 1);
//    listCheckItemsByCardName(query,res);
//});

// error handler
app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.status(400).send('Error: ' + err.message);
});

app.listen(port, function () {
  console.log('Started Slack-To-Trello ' + port);
});
