define(function(require) {
	require("lib/dom/ready!");
	var Server = require("lib/websocket/client/Server");
	var JsonLocalStorage = require("lib/JsonLocalStorage");
	var User = require("./User");
	var Lightsquare = require("./widgets/site/Lightsquare/Lightsquare");

	var db = new JsonLocalStorage("/lightsquare");
	var server = new Server("ws://" + window.location.hostname + ":8080");
	var user = new User(server, db);
	var ui = new Lightsquare(server, user, document.body);
});