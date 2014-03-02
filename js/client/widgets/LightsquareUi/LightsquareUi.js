define(function(require) {
	require("css!./resources/lightsquare_ui.css");
	var html = require("file!./resources/lightsquare_ui.html");
	var Template = require("lib/dom/Template");
	
	function LightSquareUi(parent, app) {
		this._app = app;
		this._template = new Template(html, parent);
		
		var tabControl = new TabControl(this._template.tab_bar, this._template.main);
	}
	
	return LightSquareUi;
});