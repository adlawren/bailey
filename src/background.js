// This is main process of Electron, started as first thing when your
// app starts. This script is running through entire life of your application.
// It doesn't have any windows which you can see on screen, but we can open
// window from here.

import { app, Menu, Tray, globalShortcut, dialog } from 'electron';
import fs from 'fs';
import path from 'path';
import robot from 'robotjs';
import url from 'url';

// Special module holding environment variables which you declared
// in config/env_xxx.json file.
import env from './env';

import createWindow from './helpers/window';
import { devMenuTemplate } from './menu/dev_menu_template';
import { editMenuTemplate } from './menu/edit_menu_template';

// todo: finalize choice of filename
// todo: also, harden; what happens when the file doesn't exist?
const emulationParametersJsonFilePath = '/home/adlawren/Git-Repos/bailey/test.json';

// Set globally to permit access across application initialization and closure methods
// todo: should defaults be specified here?
var loadedEmulationParameters = null;

// Set globally to preserve state from garbage collection when app is minimized
// See: https://github.com/electron/electron/issues/822#issuecomment-62981963
var systemTrayAppIcon = null;

function MouseMovementKeyBindings(upKeyBinding, rightKeyBinding, downKeyBinding, leftKeyBinding) {
  this.upKeyBinding = upKeyBinding;
  this.rightKeyBinding = rightKeyBinding;
  this.downKeyBinding = downKeyBinding;
  this.leftKeyBinding = leftKeyBinding;
}

function MouseClickKeyBindings(leftClickKeyBinding, rightClickKeyBinding) {
  this.leftClickKeyBinding = leftClickKeyBinding;
  this.rightClickKeyBinding = rightClickKeyBinding;
}

function MouseMovementParameters(movementSpeed, movementTriggerKeyBinding) {
  this.movementSpeed = movementSpeed;
  this.movementTriggerKeyBinding = movementTriggerKeyBinding;
}

function EmulationParameters(mouseMovementKeyBindings, mouseClickKeyBindings, mouseMovementParameters) {
  this.mouseMovementKeyBindings = mouseMovementKeyBindings;
  this.mouseClickKeyBindings = mouseClickKeyBindings;
  this.mouseMovementParameters = mouseMovementParameters;
}

function loadEmulationParameters(emulationParametersJsonFilePath) {
  var fileData = null;
  if (fs.existsSync(emulationParametersJsonFilePath))
  {
    let stats = fs.statSync(emulationParametersJsonFilePath);
    let fd = fs.openSync(emulationParametersJsonFilePath, "r");

    var fileDataBuffer = new Buffer(stats.size);
    fs.readSync(fd, fileDataBuffer, 0, fileDataBuffer.length, null);
    
    fileData = fileDataBuffer.toString("utf8", 0, fileDataBuffer.length);
    
    fs.closeSync(fd);
  }

  // Parse JSON into (EmulationParameters) object
  // todo: validate object state? Look for missing parameters?
  let parsedJson = JSON.parse(fileData);
  return parsedJson;
}

function saveEmulationParameters(emulationParametersJsonFilePath, emulationParameters) {
  let stringifiedEmulationParameters = JSON.stringify(emulationParameters);
  if (fs.existsSync(emulationParametersJsonFilePath))
  {
    let stats = fs.statSync(emulationParametersJsonFilePath);
    let fd = fs.openSync(emulationParametersJsonFilePath, "w");

    // Convert string to buffer
    var buffer = new Buffer.from(stringifiedEmulationParameters);
    fs.writeSync(fd, buffer, 0, buffer.length, null);
    
    fs.closeSync(fd);
  }
}

function setGlobalKeyboardShortcuts(emulationParameters) {
  const movementSpeed = emulationParameters.mouseMovementParameters.movementSpeed;
  const movementTriggerKeyBinding =
    emulationParameters.mouseMovementParameters.movementTriggerKeyBinding;

  const upKeyBinding = `${movementTriggerKeyBinding}+
    ${emulationParameters.mouseMovementKeyBindings.upKeyBinding}`;
  const rightKeyBinding = `${movementTriggerKeyBinding}+
    ${emulationParameters.mouseMovementKeyBindings.rightKeyBinding}`;
  const downKeyBinding = `${movementTriggerKeyBinding}+
    ${emulationParameters.mouseMovementKeyBindings.downKeyBinding}`;
  const leftKeyBinding = `${movementTriggerKeyBinding}+
    ${emulationParameters.mouseMovementKeyBindings.leftKeyBinding}`;

  const leftClickKeyBinding = `${movementTriggerKeyBinding}+
    ${emulationParameters.mouseClickKeyBindings.leftClickKeyBinding}`;
  const rightClickKeyBinding = `${movementTriggerKeyBinding}+
    ${emulationParameters.mouseClickKeyBindings.rightClickKeyBinding}`;

  // Register up-key callback
  // Todo: Check return value 
  globalShortcut.register(upKeyBinding, () => {
    //dialog.showMessageBox({ message: "Moving mouse up", buttons: ["OK"] }); // Todo: rm

    const currentPos = robot.getMousePos();
    robot.moveMouse(currentPos.x, currentPos.y - movementSpeed);
  });

  // Register right-key callback
  // Todo: Check return value
  globalShortcut.register(rightKeyBinding, () => {
    const currentPos = robot.getMousePos();
    robot.moveMouse(currentPos.x + movementSpeed, currentPos.y);
  });

  // Register down-key callback
  // Todo: Check return value
  globalShortcut.register(downKeyBinding, () => {
    const currentPos = robot.getMousePos();
    robot.moveMouse(currentPos.x, currentPos.y + movementSpeed);
  });

  // Register left-key callback
  // Todo: Check return value
  globalShortcut.register(leftKeyBinding, () => {
    const currentPos = robot.getMousePos();
    robot.moveMouse(currentPos.x - movementSpeed, currentPos.y);
  });

  // Register left-click callback
  globalShortcut.register(leftClickKeyBinding, () => {
    robot.mouseClick('left');
  });

  // Register right-click callback
  globalShortcut.register(rightClickKeyBinding, () => {
    robot.mouseClick('right');
  });
}

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

  // Load emulation parameters from JSON file
  loadedEmulationParameters = loadEmulationParameters(emulationParametersJsonFilePath);

  // Configure the tray icon
  systemTrayAppIcon = new Tray('./batman_logo_creative_commons_attribution_free_16_by_16.png');

  var contextMenu = Menu.buildFromTemplate([
    { label: 'Show App', click:  function(){ // Todo: relabel
      mainWindow.show();
    }},
    { label: 'Quit', click:  function(){
      app.isQuiting = true;
      app.quit();
    }}
  ]);

  systemTrayAppIcon.setContextMenu(contextMenu);
  systemTrayAppIcon.setHighlightMode('always');

  mainWindow.on('minimize', function (event) {
    event.preventDefault()
    mainWindow.hide();
  })

  setGlobalKeyboardShortcuts(loadedEmulationParameters);
});

app.on('window-all-closed', () => {
  // Save emulation parameters
  saveEmulationParameters(emulationParametersJsonFilePath, loadedEmulationParameters);

  app.quit();
});
