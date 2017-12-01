/*
 * GNOME Shell Extension: Window Switcher Launcher
 * Copyright (C) 2016  Davi da Silva Böger
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const SwitcherPopup = imports.ui.switcherPopup;
const AltTab = imports.ui.altTab;
const AppFavorites = imports.ui.appFavorites;
const Shell = imports.gi.Shell;

function openNewAppWindow(app) {
	if (app.get_n_windows() == 0) {
		app.launch(0, -1, false);
	} else {
		let appInfo = app.get_app_info();
		if (appInfo.list_actions().indexOf('new-window') >= 0) {
			appInfo.launch_action('new-window', null);
		} else {
			app.open_new_window(-1);
		}
	}
}

let WindowList_init_orig;
let WindowSwitcherPopup_init_orig;
let WindowSwitcherPopup_initialSelection_orig;
let WindowSwitcherPopup_finish_orig;

const WindowList_init_mod = function(windows, mode) {
	WindowList_init_orig.apply(this, [windows, mode]);

	let addedApps = this.windows.map(w => Shell.WindowTracker.get_default().get_window_app(w));
	let favorites = AppFavorites.getAppFavorites().getFavorites();
	for (let i in favorites) {
		let favoriteApp = favorites[i];
		if (addedApps.indexOf(favoriteApp) < 0) {
			let appIcon = new AltTab.AppIcon(favoriteApp);
			appIcon.set_size(AltTab.APP_ICON_SIZE);
			appIcon.actor.add_style_class_name('super-tab-launcher');
			appIcon.actor.opacity = 128; // cannot set opacity through CSS?
			appIcon.actor.remove_child(appIcon.label); // remove duplicated label
			this.addItem(appIcon.actor, appIcon.label);
			this.icons.push(appIcon);
		}
	}
}

const WindowSwitcherPopup_init_mod = function() {
	WindowSwitcherPopup_init_orig.apply(this, []);
	if (this._switcherList == undefined) {
		let mode = this._settings.get_enum('app-icon-mode');
		// we know there are no windows, as we have no _switcherList
		this._switcherList = new AltTab.WindowList([], mode);
		this._items = this._switcherList.icons;
	}
}

const WindowSwitcherPopup_initialSelection_mod = function(backward, binding) {
	// favorites are always added after open windows, so if first icon has no window,
	// there are no open windows
	if (!backward && !this._items[0].window) {
		this._select(0);
	} else {
		SwitcherPopup.SwitcherPopup.prototype._initialSelection.apply(this, [backward, binding]);
	}
}

const WindowSwitcherPopup_finish_mod = function() {
	let icon = this._items[this._selectedIndex];
	if (!icon.window) {
		// if it is an app icon, launch the app
		// we do not activate() to respect 'current-workspace-only' setting
		openNewAppWindow(icon.app);
		SwitcherPopup.SwitcherPopup.prototype._finish.apply(this, []);
	} else {
		WindowSwitcherPopup_finish_orig.apply(this, []);
	}
}

function init(metadata) {
}

function enable() {
	WindowList_init_orig = AltTab.WindowList.prototype._init;
	AltTab.WindowList.prototype._init = WindowList_init_mod;

	WindowSwitcherPopup_init_orig = AltTab.WindowSwitcherPopup.prototype._init;
	AltTab.WindowSwitcherPopup.prototype._init = WindowSwitcherPopup_init_mod;

	WindowSwitcherPopup_initialSelection_orig = AltTab.WindowSwitcherPopup.prototype._initialSelection;
	AltTab.WindowSwitcherPopup.prototype._initialSelection = WindowSwitcherPopup_initialSelection_mod;

	WindowSwitcherPopup_finish_orig = AltTab.WindowSwitcherPopup.prototype._finish;
	AltTab.WindowSwitcherPopup.prototype._finish = WindowSwitcherPopup_finish_mod;
}

function disable() {
	// Window switcher mods
	AltTab.WindowList.prototype._init = WindowList_init_orig;
	WindowList_init_orig = null;

	AltTab.WindowSwitcherPopup.prototype._init = WindowSwitcherPopup_init_orig;
	WindowSwitcherPopup_init_orig = null;

	AltTab.WindowSwitcherPopup.prototype._initialSelection = WindowSwitcherPopup_initialSelection_orig;
	WindowSwitcherPopup_initialSelection_orig = null;

	AltTab.WindowSwitcherPopup.prototype._finish = WindowSwitcherPopup_finish_orig;
	WindowSwitcherPopup_finish_orig = null;
}

