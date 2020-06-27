import defaultMenu from 'electron-default-menu';
import { shell, app, dialog, BrowserWindow, Menu } from 'electron';

import fs from 'fs-extra';
import path from 'path';
import tmp from 'tmp';
import { promisify } from 'util';
import { getCurrentWindow, createWindow } from './windows';
import { STATE_IPC } from '../shared-constants';

const debug = require('debug')('sleuth:menu');

export class AppMenu {
  private productionLogs: string;
  private devEnvLogs: string;
  private devModeLogs: string;
  private productionLogsExist: boolean;
  private devEnvLogsExist: boolean;
  private devModeLogsExist: boolean;
  private productionCacheExist: boolean;
  private devEnvCacheExist: boolean;
  private devModeCacheExist: boolean;
  private menu: Array<any> | null = null;

  constructor() {
    const appData = app.getPath('appData');

    // Logs
    this.productionLogs = path.join(appData, `Slack`, 'logs');
    this.devEnvLogs = path.join(appData, `SlackDevEnv`, 'logs');
    this.devModeLogs = path.join(appData, `SlackDevMode`, 'logs');
    this.productionLogsExist = fs.existsSync(this.productionLogs);
    this.devEnvLogsExist = fs.existsSync(this.devEnvLogs);
    this.devModeLogsExist = fs.existsSync(this.devModeLogs);

    // Cache
    this.productionCacheExist = fs.existsSync(this.productionLogs);
    this.devEnvCacheExist = fs.existsSync(this.devEnvLogs);
    this.devModeCacheExist = fs.existsSync(this.devModeLogs);

    this.setupMenu();
  }

  /**`
   * Returns a MenuItemOption for a given Slack logs location.
   *
   * @param {('' | 'DevEnv' | 'DevMode')} [type='']
   * @returns {Electron.MenuItemOptions}
   */
  public getOpenItem(type: '' | 'DevEnv' | 'DevMode' = ''): Electron.MenuItemConstructorOptions {
    const appData = app.getPath('appData');
    const logsPath = path.join(appData, `Slack${type}`, 'logs');
    const storagePath = path.join(appData, `Slack${type}`, 'storage');

    return {
      label: `Open local Slack${type} logs...`,
      click: async () => {
        let files: Array<string> = [];

        try {
          files = await fs.readdir(logsPath);
        } catch (error) {
          debug(`Tried to read logs directory, but failed`, { error });
        }

        if (files && files.length > 0) {
          const { webContents } = await getCurrentWindow();
          const tmpdir = await (promisify(tmp.dir) as any)({ unsafeCleanup: true });

          await fs.copy(logsPath, tmpdir);
          await fs.copy(storagePath, tmpdir);

          webContents.send('file-dropped', tmpdir);
        } else {
          dialog.showMessageBox({
            type: 'error',
            title: 'Could not find local Slack logs',
            message: `We attempted to find your local Slack's logs, but we couldn't find them. We checked for them in ${logsPath}.`
          });
        }
      }
    };
  }

  /**
   * Opens, you guessed it, a cache folder.
   */
  public getOpenCacheItem(type: '' | 'DevEnv' | 'DevMode' = ''): Electron.MenuItemConstructorOptions {
    const appData = app.getPath('appData');
    const cachePath = path.join(appData, `Slack${type}`, 'Cache');

    return {
      label: `Open local Slack${type} Cache...`,
      click: async () => {
        const { webContents } = await getCurrentWindow();
        webContents.send('file-dropped', cachePath);
      }
    };
  }

  /**
   * Checks what kind of Slack logs are locally available and returns an array
   * with appropriate items.
   *
   * @returns {Array<Electron.MenuItemOptions>}
   */
  public getOpenItems(): Array<Electron.MenuItemConstructorOptions> {
    const openItem = {
      label: 'Open...',
      accelerator: 'CmdOrCtrl+O',
      click: async () => {
        try {
          const { filePaths } = await dialog.showOpenDialog({
            defaultPath: app.getPath('downloads'),
            filters: [ { name: 'zip', extensions: [ 'zip' ] } ],
            properties: [ 'openFile', 'openDirectory', 'showHiddenFiles' ],
          });

          await this.handleFilePaths(filePaths);
        } catch (error) {
          debug(`Failed to open item. ${error}`);
        }
      }
    };

    const openItems: Array<Electron.MenuItemConstructorOptions> = [ openItem ];

    // Windows and Linux don't understand combo dialogs
    if (process.platform !== 'darwin') {
      openItem.label = 'Open Folder...';

      // Make a new one
      const openFile = {
        label: 'Open File...',
        accelerator: 'CmdOrCtrl+Shift+O',
        click: async () => {
          const { filePaths } = await dialog.showOpenDialog({
            defaultPath: app.getPath('downloads'),
            filters: [ { name: 'zip', extensions: [ 'zip' ] } ],
            properties: [ 'openFile', 'showHiddenFiles' ],
          });

          await this.handleFilePaths(filePaths);
        }
      };

      openItems.push(openFile);
    }

    if (this.productionLogsExist || this.devEnvLogsExist || this.devModeLogsExist) {
      openItems.push({ type: 'separator' });
    }

    if (this.productionLogsExist) openItems.push(this.getOpenItem());
    if (this.devEnvLogsExist) openItems.push(this.getOpenItem('DevEnv'));
    if (this.devModeLogsExist) openItems.push(this.getOpenItem('DevMode'));

    // We only support cache files on macOS right now
    if (process.platform === 'darwin') {
      if (this.productionCacheExist || this.devEnvCacheExist || this.devModeCacheExist) {
        openItems.push({ type: 'separator' });
      }

      if (this.productionCacheExist) openItems.push(this.getOpenCacheItem());
      if (this.devEnvCacheExist) openItems.push(this.getOpenCacheItem('DevEnv'));
      if (this.devModeCacheExist) openItems.push(this.getOpenCacheItem('DevMode'));
    }

    return openItems;
  }

  /**
   * Get "Prune ..." items
   */
  public getPruneItems(): Array<Electron.MenuItemConstructorOptions> {
    const getPruneItem = (name: string, targetPath: string) => ({
      label: `Prune ${name}`,
      click: async () => {
        try {
          fs.emptyDir(targetPath);
        } catch (error) {
          dialog.showMessageBox({
            type: 'error',
            title: 'Could not prune logs',
            message: `We attempted to prune logs at ${targetPath}, but failed with the following error: "${error}".`
          });
        }
      }
    });

    const result = [];

    if (this.productionLogsExist) {
      result.push(getPruneItem('Slack Logs (Production)', this.productionLogs));
    }

    if (this.devModeLogsExist) {
      result.push(getPruneItem('Slack Logs (DevMode)', this.devModeLogs));
    }

    if (this.devEnvLogsExist) {
      result.push(getPruneItem('Slack Logs (DevEnv)', this.devEnvLogs));
    }

    return result;
  }

  public insertSpotlightItem() {
    if (!this.menu) return;

    const viewItem = this.menu.find((item) => item.label === 'View');

    if (viewItem && viewItem.submenu) {
      (viewItem.submenu as Array<Electron.MenuItemConstructorOptions>).push({
        type: 'separator'
      });

      (viewItem.submenu as Array<Electron.MenuItemConstructorOptions>).push({
        label: 'Show Omnibar',
        accelerator: 'CmdOrCtrl+K',
        click(_item: Electron.MenuItem, browserWindow: BrowserWindow) {
          browserWindow.webContents.send(STATE_IPC.TOGGLE_SPOTLIGHT);
        }
      });
    }
  }

  public getEditMenu(): Electron.MenuItemConstructorOptions {
    return {
      label: 'Edit',
      submenu: [
        {
          role: 'cut',
        }, {
          role: 'copy'
        }, {
          role: 'paste'
        }, {
          type: 'separator'
        }, {
          label: 'Find',
          accelerator: 'CmdOrCtrl+F',
          click(_item: Electron.MenuItem, browserWindow: BrowserWindow) {
            browserWindow.webContents.send('find');
          }
        }
      ]
    };
  }

  /**
   * Actually creates the menu.
   */
  public setupMenu() {
    require('electron-context-menu')();

    this.menu = defaultMenu(app, shell) as Array<any>;

    const preferencesItem = {
      label: 'Preferences',
      accelerator: 'CmdOrCtrl+,',
      click: async () => {
        const { webContents } = await getCurrentWindow();
        webContents.send('preferences-show');
      }
    };

    const newWindowItem = {
      label: 'New Window',
      accelerator: 'CmdOrCtrl+N',
      click: () => createWindow()
    };

    const newAndOpen = [
      newWindowItem,
      { type: 'separator' },
      ...this.getOpenItems()
    ];

    const edit = this.getEditMenu();

    if (process.platform === 'darwin') {
      (this.menu[0].submenu as Array<any>).splice(1, 0, preferencesItem);
      this.menu.splice(1, 0, { label: 'File', submenu: newAndOpen });
      this.menu.splice(2, 0, edit);
    } else {
      const windowsLinuxSubmenu = [ ...newAndOpen, { type: 'separator' }, preferencesItem ];
      this.menu.splice(0, 1, { label: 'File', submenu: windowsLinuxSubmenu });
      this.menu.splice(1, 0, edit);
    }

    this.insertSpotlightItem();

    this.menu.push({
      label: 'Utilities',
      submenu: [
        {
          label: 'Open Backtrace',
          click(_item: Electron.MenuItem, browserWindow: BrowserWindow) {
            browserWindow.webContents.send('open-backtrace');
          }
        },
        { type: 'separator' },
        ...this.getPruneItems()
      ]
    });

    Menu.setApplicationMenu(Menu.buildFromTemplate(this.menu));
  }

  private async handleFilePaths(filePaths: Array<string>): Promise<void> {
    if (filePaths && filePaths.length > 0) {
      const { webContents } = await getCurrentWindow();
      webContents.send('file-dropped', filePaths[0]);
    }
  }
}

let menu: AppMenu | undefined;

export function createMenu() {
  menu = menu || new AppMenu();
}
