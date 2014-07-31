define(function(require) {
	require("css!./home_page.css");
	var html = require("file!./home_page.html");
	var Ractive = require("lib/dom/Ractive");
	var SeekForm = require("./_SeekForm/SeekForm");
	var SeekGraph = require("./_SeekGraph/SeekGraph");
	var LoginForm = require("./_LoginForm/LoginForm");
	var GameBackupList = require("./_GameBackupList/GameBackupList");
	var SeekList = require("SeekList");
	var RegisterForm = require("./_RegisterForm/RegisterForm");
	var RandomGames = require("RandomGames");
	var CurrentGames = require("./_CurrentGames/CurrentGames");
	
	function HomePage(user, server, router, parent) {
		this._user = user;
		this._server = server;
		this._router = router;
		this._seekList = new SeekList(this._server);
		this._setupTemplate(parent);
		this._handleUserEvents();
	}
	
	HomePage.prototype._setupTemplate = function(parent) {
		this._template = new Ractive({
			el: parent,
			template: html,
			data: {
				tab: "home",
				dialog: null,
				username: this._user.getUsername(),
				userIsLoggedIn: this._user.isLoggedIn(),
				registered: false
			}
		});
		
		new LoginForm(this._user, this._template.nodes.login_form);
		new SeekForm(this._user, this._server, this._template.nodes.create_seek);
		new SeekGraph(this._seekList, this._user, this._template.nodes.seek_graph);
		
		var registerForm = new RegisterForm(this._user, this._template.nodes.register_form);
		
		registerForm.Registered.addHandler(function(data) {
			this._template.set("registered", true);
			this._template.set("registerAutoLoggedIn", data.loggedIn);
			this._template.set("registeredUsername", data.registeredUsername);
		}, this);
		
		this._gameBackupList = new GameBackupList(this._user, this._template.nodes.game_backup_list);
		
		this._gameBackupList.GameRestored.addHandler(function() {
			if(this._template.get("dialog") === "restoreGame") {
				this._hideDialog();
			}
		}, this);
		
		this._currentGames = new CurrentGames(new RandomGames(this._server), this._template.nodes.current_games);
		
		this._currentGames.ClickGame.addHandler(function(id) {
			this._router.navigate("/game/" + id);
		}, this);
		
		this._template.on("select_tab", (function(event, tab) {
			this._template.set("tab", tab);
		}).bind(this));
		
		this._template.on("restore_game", (function() {
			this._showDialog("restoreGame");
			this._gameBackupList.refresh();
		}).bind(this));
		
		var lastClickWasOnDialog = false;
		
		this._template.on("hide_dialog", (function() {
			if(!lastClickWasOnDialog) {
				this._hideDialog();
			}
			
			lastClickWasOnDialog = false;
		}).bind(this));
		
		this._template.on("dialog_click", function() {
			lastClickWasOnDialog = true;
		});
		
		this._template.on("register", (function() {
			this._showDialog("register");
		}).bind(this));
		
		this._template.on("register_done", (function() {
			this._hideDialog();
			this._template.set("registered", false);
		}).bind(this));
	}
	
	HomePage.prototype._showDialog = function(dialog) {
		this._template.set("dialog", dialog);
	}
	
	HomePage.prototype._hideDialog = function() {
		this._template.set("dialog", null);
	}
	
	HomePage.prototype._handleUserEvents = function() {
		this._user.LoggedIn.addHandler(function() {
			this._updateUserDependentElements();
		}, this);
		
		this._user.LoggedOut.addHandler(function() {
			this._updateUserDependentElements();
		}, this);
	}
	
	HomePage.prototype._updateUserDependentElements = function() {
		this._template.set("username", this._user.getUsername());
		this._template.set("userIsLoggedIn", this._user.isLoggedIn());
	}
	
	HomePage.prototype.show = function() {
		this._startUpdating();
	}
	
	HomePage.prototype.hide = function() {
		this._stopUpdating();
	}
	
	HomePage.prototype.remove = function() {
		this._stopUpdating();
	}
	
	HomePage.prototype._startUpdating = function() {
		this._seekList.startUpdating();
		this._currentGames.startUpdating();
	}
	
	HomePage.prototype._stopUpdating = function() {
		this._seekList.stopUpdating();
		this._currentGames.stopUpdating();
	}
	
	return HomePage;
});