import * as cron from 'node-cron';
import { storage } from './storage';
import { log } from './vite';

export class SchedulerService {
  private tasks: cron.ScheduledTask[] = [];

  constructor() {
    this.initializeTasks();
  }

  private initializeTasks() {
    // Schedule alert cleanup at 3:00 AM every day
    const alertCleanupTask = cron.schedule('0 3 * * *', async () => {
      try {
        log('Starting daily alert history cleanup at 3:00 AM...');
        await storage.clearAllAlerts();
        log('Alert history cleanup completed successfully');
      } catch (error) {
        console.error('Error during scheduled alert cleanup:', error);
      }
    }, {
      timezone: 'America/Chicago' // Central Time (CST/CDT)
    });

    this.tasks.push(alertCleanupTask);
  }

  public start() {
    log('Starting scheduled tasks...');
    this.tasks.forEach((task, index) => {
      task.start();
      log(`Scheduled task ${index + 1} started`);
    });
    log('Daily alert cleanup scheduled for 3:00 AM');
  }

  public stop() {
    log('Stopping scheduled tasks...');
    this.tasks.forEach((task) => {
      task.stop();
    });
    log('All scheduled tasks stopped');
  }
}

export const scheduler = new SchedulerService();