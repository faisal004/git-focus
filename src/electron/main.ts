import { app, BrowserWindow, } from "electron";
import electronUpdater from "electron-updater";
const { autoUpdater } = electronUpdater;
import { ipcMainHandle, isDev } from "./utils.js";
import { getStaticData, pollResources } from "./resourceManager.js";
import { getPreloadPath, getUIPath } from "./pathResolver.js";

app.on("ready", () => {
  const mainWindow = new BrowserWindow({
    webPreferences: {
      preload: getPreloadPath()
    }
  });
  if (isDev()) {
    mainWindow.loadURL("http://localhost:5123");
  } else {
    mainWindow.loadFile(getUIPath());
  }
  pollResources(mainWindow);

  ipcMainHandle("getStaticData", () => {
    return getStaticData()
  });
  autoUpdater.logger = console;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    console.log("checking-for-update");
    mainWindow.webContents.send("checking-for-update");
  });

  autoUpdater.on("update-available", (info) => {
    console.log("update-available", info);
    mainWindow.webContents.send("update-available");
    // We keep manual download trigger from UI instead of auto-downloading here
  });

  autoUpdater.on("update-not-available", (info) => {
    console.log("update-not-available", info);
    mainWindow.webContents.send("update-not-available");
  });

  autoUpdater.on("error", (err) => {
    console.error("auto-updater-error", err);
    mainWindow.webContents.send("update-error", err.toString());
  });

  autoUpdater.on("update-downloaded", (info) => {
    console.log("update-downloaded", info);
    mainWindow.webContents.send("update-downloaded");
  });

  autoUpdater.on("download-progress", (progress) => {
    console.log(`Download speed: ${progress.bytesPerSecond} - Downloaded ${progress.percent}% (${progress.transferred}/${progress.total})`);
    mainWindow.webContents.send("download-progress", progress);
  });

  autoUpdater.checkForUpdates();


  ipcMainHandle("startDownload", () => {
    console.log("Starting download...");
    autoUpdater.downloadUpdate();
  });
  ipcMainHandle("installUpdate", () => {
    console.log("Installing update...");
    autoUpdater.quitAndInstall();
  });
});
