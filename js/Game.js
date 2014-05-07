define(function(require) {
	var ChessGame = require("chess/Game");
	var Colour = require("chess/Colour");
	var ChessMove = require("chess/Move");
	var Move = require("common/Move");
	var Event = require("lib/Event");
	var Square = require("chess/Square");
	var PieceType = require("chess/PieceType");
	var Fen = require("chess/Fen");
	var Clock = require("./Clock");
	var TimingStyle = require("chess/TimingStyle");
	var Time = require("chess/Time");
	require("lib/Array.getShallowCopy");

	function Game(server, gameDetails) {
		this.PromotionPieceNeeded = new Event(this);
		this.Move = new Event(this);
		
		this._server = server;
		this._gameDetails = gameDetails;
		this._id = this._gameDetails.id;
		
		this._players = {};
		this._players[Colour.white] = this._gameDetails.white;
		this._players[Colour.black] = this._gameDetails.black;
		
		this._isInProgress = true;
		this._history = [];
		this._moveQueue = [];
		
		this._timingStyle = new TimingStyle({
			initialTime: Time.fromUnitString(this._gameDetails.options.initialTime, Time.minutes),
			timeIncrement: Time.fromUnitString(this._gameDetails.options.timeIncrement, Time.seconds)
		});
		
		this._gameDetails.history.forEach((function(move) {
			this._history.push(Move.fromJSON(move));
		}).bind(this));
		
		var startingFen = Fen.STARTING_FEN;
		
		if(this._history.length > 0) {
			startingFen = this._history[this._history.length - 1].getPositionAfter().getFen();
		}
		
		this._game = new ChessGame({
			startingFen: startingFen,
			isTimed: false
		});
		
		this._game.GameOver.addHandler(this, function() {
			this._gameOver();
		});
		
		this._clock = new Clock(this._server, this, this._timingStyle);
		
		this._server.subscribe("/game/" + this._id + "/move", (function(move) {
			this._handleServerMove(move);
		}).bind(this));
		
		this._server.send("/game/" + this._id + "/request/moves", {
			startingIndex: this._history.length
		});
	}
	
	Game.prototype.getId = function() {
		return this._id;
	}

	Game.prototype.move = function(from, to, promoteTo) {
		if(this._isInProgress) {
			var move = new ChessMove(this.getPosition(), from, to, promoteTo);
			
			if(move.isLegal()) {
				if(move.isPromotion() && promoteTo === undefined) {
					this.PromotionPieceNeeded.fire({
						move: move
					});
				}
				
				else {
					this._game.move(from, to, promoteTo);
					this._history.push(Move.fromMove(move));
					
					this._server.send("/game/" + this._id + "/move", {
						from: from.squareNo,
						to: to.squareNo,
						promoteTo: (promoteTo ? promoteTo.sanString : undefined)
					});
					
					this.Move.fire({
						move: move
					});
				}
			}
		}
	}
	
	Game.prototype.getPosition = function() {
		return this._game.getPosition();
	}
	
	Game.prototype.getHistory = function() {
		return this._history.getShallowCopy();
	}
	
	Game.prototype.getUserColour = function(user) {
		var player;
		var userColour = null;
		
		Colour.forEach(function(colour) {
			player = this._players[colour];
			
			if((user.isLoggedIn() && user.getUsername() === player.username) || user.getId() === player.id) {
				userColour = colour;
			}
		}, this);
		
		return userColour;
	}
	
	Game.prototype.getPlayerName = function(colour) {
		return this._players[colour].username;
	}
	
	Game.prototype.getTimeLeft = function(colour) {
		return this._clock.getTimeLeft(colour);
	}
	
	Game.prototype.getTimingStyle = function() {
		return this._timingStyle;
	}
	
	Game.prototype.getStartTime = function() {
		return this._gameDetails.startTime;
	}
	
	Game.prototype._handleServerMove = function(move) {
		if(move.index > this._history.length) {
			this._moveQueue[move.index] = move;
		}
		
		else {
			this._applyServerMove(move);
			
			var i = move.index;
			var nextMove;
			
			while(nextMove = this._moveQueue[++i]) {
				this._applyServerMove(nextMove);
			}
		}
	}
	
	Game.prototype._applyServerMove = function(serverMove) {
		if(serverMove.index in this._history) {
			this._history[serverMove.index].setTime(serverMove.time);
		}
		
		else {
			var chessMove = this._game.move(
				Square.fromSquareNo(serverMove.from),
				Square.fromSquareNo(serverMove.to),
				serverMove.promoteTo ? PieceType.fromSanString(serverMove.promoteTo) : PieceType.queen
			);
			
			if(chessMove !== null && chessMove.isLegal()) {
				var move = Move.fromMove(chessMove);
				
				move.setTime(serverMove.time);
				
				this._history.push(move);
				
				this.Move.fire({
					move: move
				});
			}
		}
	}
	
	Game.prototype._gameOver = function() {
		this._isInProgress = false;
	}
	
	return Game;
});