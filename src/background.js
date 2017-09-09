// This is main process of Electron, started as first thing when your
// app starts. This script is running through entire life of your application.
// It doesn't have any windows which you can see on screen, but we can open
// window from here.

import path from 'path';
import url from 'url';
import { app, Menu, Tray, globalShortcut, dialog } from 'electron';
import { devMenuTemplate } from './menu/dev_menu_template';
import { editMenuTemplate } from './menu/edit_menu_template';
import createWindow from './helpers/window';
import robot from 'robotjs';

// JSON test
const fs = require('fs');
const { URL } = require('url');

// Special module holding environment variables which you declared
// in config/env_xxx.json file.
import env from './env';

var appIcon = null;

const setApplicationMenu = () => {
  const menus = [editMenuTemplate];
  if (env.name !== 'production') {
    menus.push(devMenuTemplate);
  }
  Menu.setApplicationMenu(Menu.buildFromTemplate(menus));
};

// Save userData in separate folders for each environment.
// Thanks to this you can use production and development versions of the app
// on same machine like those are two separate apps.
if (env.name !== 'production') {
  const userDataPath = app.getPath('userData');
  app.setPath('userData', `${userDataPath} (${env.name})`);
}

// Todo: define function to move mouse - for use in the keypress event callbacks

app.on('ready', () => {
  // Boilerplate
  setApplicationMenu();

  const mainWindow = createWindow('main', {
    width: 1000,
    height: 600,
  });

  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'app.html'),
    protocol: 'file:',
    slashes: true,
  }));

  if (env.name === 'development') {
    mainWindow.openDevTools();
  }

  //// JSON test
  // Read file
  const fileName = '/home/adlawren/Git-Repos/bailey/test.json';

  var data = null;
  if (fs.existsSync(fileName))
  {
    let stats = fs.statSync(fileName);
    let fd = fs.openSync(fileName, "r");

    var buffer = new Buffer(stats.size);
    
    fs.readSync(fd, buffer, 0, buffer.length, null);
    
    data = buffer.toString("utf8", 0, buffer.length);
    // dialog.showMessageBox({ message: "data" + data, buttons: ["OK"] });
    
    fs.closeSync(fd);
  }

  // Parse JSON into object
  let parsedJson = JSON.parse(data);
  dialog.showMessageBox({ message: "field1 : " + parsedJson['field1'], buttons: ["OK"] });

  // Update Json value
  parsedJson['field1'] = 'updated';

  // Write json to new file
  let stringified = JSON.stringify(parsedJson);
  dialog.showMessageBox({ message: "stringified : " + stringified, buttons: ["OK"] });

  if (fs.existsSync(fileName))
  {
    let stats = fs.statSync(fileName);
    let fd = fs.openSync(fileName, "w");

    // Convert string to buffer
    var buffer = new Buffer.from(stringified);
    
    fs.writeSync(fd, buffer, 0, buffer.length, null);
    
    fs.closeSync(fd);
  }


  // Configure the tray icon
  appIcon = new Tray('./batman_logo_creative_commons_attribution_free_16_by_16.png');

  var contextMenu = Menu.buildFromTemplate([
    { label: 'Show App', click:  function(){ // Todo: relabel
      mainWindow.show();
    }},
    { label: 'Quit', click:  function(){
      app.isQuiting = true;
      app.quit();
    }}
  ]);

  appIcon.setContextMenu(contextMenu);
  appIcon.setHighlightMode('always');

  mainWindow.on('minimize', function (event) {
    event.preventDefault()
    mainWindow.hide();
  })

  //// Test

  // Params
  const delta = 25;

  const modifier = 'CommandOrControl+Shift';

  const upKeyLabel = `${modifier}+I`;
  const rightKeyLabel = `${modifier}+L`;
  const downKeyLabel = `${modifier}+K`;
  const leftKeyLabel = `${modifier}+J`;
  const leftClickKeyLabel = `Shift+U`; //`${modifier}+U`;
  const rightClickKeyLabel = `${modifier}+O`;

  // Register up-key callback
  // Todo: Check return value 
  globalShortcut.register(upKeyLabel, () => {
    //dialog.showMessageBox({ message: "Moving mouse up", buttons: ["OK"] }); // Todo: rm

    const currentPos = robot.getMousePos();
    robot.moveMouse(currentPos.x, currentPos.y - delta);
  });

  // Register right-key callback
  // Todo: Check return value
  globalShortcut.register(rightKeyLabel, () => {
    const currentPos = robot.getMousePos();
    robot.moveMouse(currentPos.x + delta, currentPos.y);
  });

  // Register down-key callback
  // Todo: Check return value
  globalShortcut.register(downKeyLabel, () => {
    const currentPos = robot.getMousePos();
    robot.moveMouse(currentPos.x, currentPos.y + delta);
  });

  // Register left-key callback
  // Todo: Check return value
  globalShortcut.register(leftKeyLabel, () => {
    const currentPos = robot.getMousePos();
    robot.moveMouse(currentPos.x - delta, currentPos.y);
  });

  // Register left-click callback
  globalShortcut.register(leftClickKeyLabel, () => {
    robot.mouseClick('left');
  });

  // Register right-click callback
  globalShortcut.register(rightClickKeyLabel, () => {
    robot.mouseClick('right');
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
