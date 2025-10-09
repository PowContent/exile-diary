import { makeAutoObservable, runInAction } from 'mobx';
import { Log, LogData } from './domain/log';
import { electronService } from '../electron.service';
const { logger, ipcRenderer } = electronService;

// Mobx store for Items
export default class ItemStore {
  logs: Log[] = [];
  isLoading = true;
  maxSize = 1000; // Maximum number of logs to keep in memory

  constructor(logData) {
    makeAutoObservable(this);
    this.createLogs(logData);
    ipcRenderer.on('add-log', (event, log: LogData) => {
      this.createLogs(log);
    });
  }

  createLogs(logData: LogData) {
    logger.verbose(`Creating frontend log messages. Logs: ${this.logs.length}/${this.maxSize}`);
    this.isLoading = true;
    runInAction(() => {
      const log = new Log(this, logData);
      this.logs.push(log);
      if (this.logs.length > this.maxSize) {
        // Remove oldest logs from the beginning of the array
        this.logs.splice(0, this.logs.length - this.maxSize);
      }
      this.isLoading = false;
    });
  }
}
