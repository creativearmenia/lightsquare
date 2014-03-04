define(function(require) {
	var Challenge = require("./Challenge");
	var Game = require("./Game");
	
	function Application(server) {
		this._server = server;
		
		this.NewChallenge = new Event(this);
		this.NewGame = new Event(this);
		
		this._server.subscribe("/challenge/new", (function(challenges) {
			challenges.forEach((function(challenge) {
				this.NewChallenge.fire({
					challenge: new Challenge(this._server, challenge)
				});
			}).bind(this));
		}).bind(this));
		
		this._server.subscribe("/game/new", (function(game) {
			this.NewGame.fire({
				game: new Game(this._server, game)
			});
		}).bind(this));
	}
	
	Application.prototype.createChallenge = function(options) {
		this._server.send("/challenge/create", options);
	}
	
	return Application;
});