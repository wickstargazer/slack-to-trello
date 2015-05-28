var express = require('express');
var bodyParser = require('body-parser');
var Trello = require("node-trello");
var trello = new Trello(process.env.TRELLO_KEY, process.env.TRELLO_TOKEN);

var app = express();
var port = process.env.PORT || 3000;
 
app.use(bodyParser.urlencoded({ extended: true }));
 
function postToTrello(listId, command, text, cb) {
  if (text == undefined) {
    throw new Error('Format is ' + command + ' name | description(optional)');
  }

  var name_and_desc = text.split('|');

	var card_data = {
		"name" : name_and_desc.shift(),
		"desc" : name_and_desc.shift()
	};

	trello.post("/1/lists/" + listId + "/cards", card_data, cb);
}

app.post('/*', function(req, res) {
  	var listId = req.params[0];
    var command = req.body.command,
        text = req.body.text;

    postToTrello(listId, command, text, function(err, data) {
		if (err) throw err;
  		console.log(data);
  		res.status(200).send('created card');
    });
});

// test route
app.get('/', function (req, res) { res.status(200).send('SupportKit.io loves Slack and Trello!') });
 
// error handler
app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.status(200).send('Error: ' + err.message);
});
 
app.listen(port, function () {
  console.log('Started Slack-To-Trello ' + port);
});