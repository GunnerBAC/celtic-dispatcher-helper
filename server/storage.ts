import { 
  drivers, 
  driverLocations, 
  settings, 
  alerts,
  dispatchers,
  teams,
  type Driver, 
  type InsertDriver,
  type DriverLocation,
  type InsertDriverLocation,
  type Settings,
  type InsertSettings,
  type Alert,
  type InsertAlert,
  type DriverWithLocation,
  type Team,
  type InsertTeam
} from "@shared/schema";

import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Driver operations
  getDrivers(): Promise<Driver[]>;
  getDriver(id: number): Promise<Driver | undefined>;
  createDriver(driver: InsertDriver): Promise<Driver>;
  updateDriver(id: number, driver: Partial<InsertDriver>): Promise<Driver | undefined>;
  deleteDriver(id: number): Promise<boolean>;
  
  // Location operations
  getDriverLocation(driverId: number): Promise<DriverLocation | undefined>;
  updateDriverLocation(location: InsertDriverLocation): Promise<DriverLocation>;
  getDriversWithLocations(): Promise<DriverWithLocation[]>;
  
  // Settings operations
  getSettings(): Promise<Settings>;
  updateSettings(settings: InsertSettings): Promise<Settings>;
  
  // Alert operations
  getAlerts(): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  markAlertAsRead(id: number): Promise<void>;
  getUnreadAlerts(): Promise<Alert[]>;
  clearDriverAlerts(driverId: number): Promise<void>;
  cleanupOrphanedAlerts(): Promise<void>;
  clearReadAlerts(): Promise<void>;
  clearAllAlerts(): Promise<void>;
  
  // Dispatcher operations
  getDispatchers(): Promise<string[]>;
  addDispatcher(name: string): Promise<void>;
  removeDispatcher(name: string): Promise<void>;
  
  // Team operations
  getTeams(): Promise<Team[]>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: number, team: Partial<InsertTeam>): Promise<Team | undefined>;
  deleteTeam(id: number): Promise<boolean>;
  
  // Detention calculation
  calculateTotalDetention(driverId: number): Promise<number | null>;
}

export class DatabaseStorage implements IStorage {
  async getDrivers(): Promise<Driver[]> {
    const result = await db.select().from(drivers);
    return result;
  }

  async getDriver(id: number): Promise<Driver | undefined> {
    const [driver] = await db.select().from(drivers).where(eq(drivers.id, id));
    return driver || undefined;
  }

  async createDriver(insertDriver: InsertDriver): Promise<Driver> {
    const [driver] = await db
      .insert(drivers)
      .values(insertDriver)
      .returning();
    return driver;
  }

  async updateDriver(id: number, updateData: Partial<InsertDriver>): Promise<Driver | undefined> {
    const [driver] = await db
      .update(drivers)
      .set(updateData)
      .where(eq(drivers.id, id))
      .returning();
    return driver || undefined;
  }

  async deleteDriver(id: number): Promise<boolean> {
    try {
      // First delete all alerts for this driver (foreign key constraint)
      await db.delete(alerts).where(eq(alerts.driverId, id));
      
      // Then delete the driver location if it exists
      await db.delete(driverLocations).where(eq(driverLocations.driverId, id));
      
      // Finally delete the driver
      const result = await db.delete(drivers).where(eq(drivers.id, id));
      
      return true; // If no error is thrown, deletion was successful
    } catch (error) {
      console.error('Error deleting driver:', error);
      return false;
    }
  }

  async getDriverLocation(driverId: number): Promise<DriverLocation | undefined> {
    const [location] = await db.select().from(driverLocations).where(eq(driverLocations.driverId, driverId));
    return location || undefined;
  }

  async updateDriverLocation(insertLocation: InsertDriverLocation): Promise<DriverLocation> {
    // Check if location exists for this driver
    const existingLocation = await this.getDriverLocation(insertLocation.driverId);
    
    if (existingLocation) {
      // Use explicit field updates to ensure all fields are properly set
      // Only update fields that are actually provided
      const updateData: any = {};
      
      if (insertLocation.location !== undefined) {
        updateData.location = insertLocation.location;
      }
      if (insertLocation.latitude !== undefined) {
        updateData.latitude = insertLocation.latitude;
      }
      if (insertLocation.longitude !== undefined) {
        updateData.longitude = insertLocation.longitude;
      }
      if (insertLocation.appointmentTime !== undefined) {
        updateData.appointmentTime = insertLocation.appointmentTime;
      }
      if (insertLocation.departureTime !== undefined) {
        updateData.departureTime = insertLocation.departureTime;
      }
      if (insertLocation.stopType !== undefined) {
        updateData.stopType = insertLocation.stopType;
      }
      if (insertLocation.finalDetentionMinutes !== undefined) {
        updateData.finalDetentionMinutes = insertLocation.finalDetentionMinutes;
      }
      if (insertLocation.finalDetentionCost !== undefined) {
        updateData.finalDetentionCost = insertLocation.finalDetentionCost;
      }
      
      const [updatedLocation] = await db
        .update(driverLocations)
        .set(updateData)
        .where(eq(driverLocations.driverId, insertLocation.driverId))
        .returning();
      return updatedLocation;
    } else {
      const [location] = await db
        .insert(driverLocations)
        .values(insertLocation)
        .returning();
      return location;
    }
  }

  // Helper function to format time with seconds, conditionally showing hours
  private formatTimeWithSeconds(hours: number, minutes: number, seconds: number, suffix: string = ''): string {
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s${suffix}`;
    } else {
      return `${minutes}m ${seconds}s${suffix}`;
    }
  }

  // Helper function to format time without seconds, conditionally showing hours
  private formatTime(totalMinutes: number, suffix: string = ''): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m${suffix}`;
    } else {
      return `${minutes}m${suffix}`;
    }
  }

  async getDriversWithLocations(): Promise<DriverWithLocation[]> {
    // Use a single JOIN query instead of N+1 queries for better performance
    const driversWithLocationData = await db.select({
      driver: drivers,
      location: driverLocations,
    }).from(drivers)
    .leftJoin(driverLocations, eq(drivers.id, driverLocations.driverId));

    const driversWithLocations: DriverWithLocation[] = [];

    for (const { driver, location } of driversWithLocationData) {
      
      let status: 'active' | 'warning' | 'critical' | 'detention' | 'at-stop' | 'completed' = 'active';
      let duration = '';
      let detentionMinutes = 0;
      let detentionCost = 0;
      let timeToDetention = '';
      let isInDetention = false;
      
      if (location) {
        if (location.appointmentTime && location.departureTime) {
          // Driver has completed their load (has departure time)
          detentionMinutes = location.finalDetentionMinutes || 0;
          detentionCost = location.finalDetentionCost || 0;
          
          if (detentionMinutes > 0) {
            // If there was detention, keep showing detention status (red) with final numbers
            status = 'detention';
            isInDetention = true;
            const hours = Math.floor(detentionMinutes / 60);
            const minutes = detentionMinutes % 60;
            if (hours > 0) {
              duration = `${hours}h ${minutes}m detention (completed)`;
            } else {
              duration = `${minutes}m detention (completed)`;
            }
          } else {
            // Only show completed status if no detention occurred
            status = 'completed';
            duration = 'Completed';
          }
        } else if (location.appointmentTime && !location.departureTime) {
          // Calculate detention logic based on stop type
          const appointmentTime = new Date(location.appointmentTime);
          const stopType = location.stopType || 'regular';
          
          // Validate appointment time parsing
          if (isNaN(appointmentTime.getTime())) {
            console.error('Invalid appointment time:', location.appointmentTime);
            status = 'active';
            duration = 'Standby (Invalid appointment time)';
            continue;
          }
          
          let detentionHours = 2; // Default for regular stops
          let warningMinutesAfterDetention = 0; // Default: no warning after detention
          let warningMinutesBeforeDetention = 30; // Default: 30 minutes before detention
          
          // Set detention timing based on stop type
          switch (stopType) {
            case 'multi-stop':
              detentionHours = 1; // 1 hour detention
              warningMinutesBeforeDetention = 15; // 15 minutes before detention
              warningMinutesAfterDetention = 0;
              break;
            case 'rail':
              detentionHours = 1; // 1 hour detention  
              warningMinutesBeforeDetention = 0; // No warning before detention
              warningMinutesAfterDetention = 20; // Reminder 20 minutes after detention starts
              break;
            case 'no-billing':
              detentionHours = 0.25; // 15 minutes detention
              warningMinutesBeforeDetention = 0; // No warning before detention
              warningMinutesAfterDetention = 20; // Reminder 20 minutes after detention starts
              break;
            case 'drop-hook':
              detentionHours = 0.5; // 30 minutes detention
              warningMinutesBeforeDetention = 0; // No warning before detention
              warningMinutesAfterDetention = 30; // Reminder 30 minutes after detention starts
              break;
            default: // 'regular'
              detentionHours = 2; // 2 hours detention
              warningMinutesBeforeDetention = 30; // 30 minutes before detention
              warningMinutesAfterDetention = 30; // Reminder 30 minutes after detention starts
          }
          
          const detentionStartTime = new Date(appointmentTime.getTime() + (detentionHours * 60 * 60 * 1000));
          const warningTimeBeforeDetention = new Date(detentionStartTime.getTime() - (warningMinutesBeforeDetention * 60 * 1000));
          const warningTimeAfterDetention = new Date(detentionStartTime.getTime() + (warningMinutesAfterDetention * 60 * 1000));
          
          // Create current time for comparison
          const currentTime = new Date();
          
          // Validate all date calculations
          if (isNaN(detentionStartTime.getTime()) || isNaN(currentTime.getTime())) {
            console.error('Invalid date calculation for driver', driver.id);
            status = 'active';
            duration = 'Standby (Date calculation error)';
            continue;
          }

          if (currentTime >= detentionStartTime) {
            // In detention
            isInDetention = true;
            const detentionMs = currentTime.getTime() - detentionStartTime.getTime();
            detentionMinutes = Math.floor(detentionMs / (1000 * 60));
            const detentionSeconds = Math.floor((detentionMs % (1000 * 60)) / 1000);
            
            // Any driver accumulating detention time shows detention status
            status = 'detention';
            
            // Calculate cost - same for all stop types at $1.25 per minute
            detentionCost = detentionMinutes * 1.25; // $1.25 per minute
            
            // Duration display with seconds for all stop types
            duration = this.formatTimeWithSeconds(Math.floor(detentionMinutes / 60), detentionMinutes % 60, detentionSeconds, ' detention');
          } else if (currentTime >= warningTimeBeforeDetention && warningMinutesBeforeDetention > 0) {
            // Warning period before detention (only for stops that have warnings before detention)
            status = 'warning';
            const timeToDetentionMs = detentionStartTime.getTime() - currentTime.getTime();
            const minutesToDetention = Math.floor(timeToDetentionMs / (1000 * 60));
            const secondsToDetention = Math.floor((timeToDetentionMs % (1000 * 60)) / 1000);
            timeToDetention = `${minutesToDetention}m ${secondsToDetention}s to detention`;
            duration = timeToDetention;
          } else {
            // Safe period
            const timeToDetentionMs = detentionStartTime.getTime() - currentTime.getTime();
            
            const hoursToDetention = Math.floor(timeToDetentionMs / (1000 * 60 * 60));
            const minutesToDetention = Math.floor((timeToDetentionMs % (1000 * 60 * 60)) / (1000 * 60));
            const secondsToDetention = Math.floor((timeToDetentionMs % (1000 * 60)) / 1000);
            
            // Handle edge case where time calculation might go negative (race condition)
            if (timeToDetentionMs <= 0) {
              // Already past detention start time - this should have been caught above
              status = 'detention';
              isInDetention = true;
              const detentionMs = Math.abs(timeToDetentionMs);
              detentionMinutes = Math.floor(detentionMs / (1000 * 60));
              detentionCost = detentionMinutes * 1.25;
              const detentionSeconds = Math.floor((detentionMs % (1000 * 60)) / 1000);
              duration = this.formatTimeWithSeconds(Math.floor(detentionMinutes / 60), detentionMinutes % 60, detentionSeconds, ' detention');
            } else {
              // Normal countdown to detention - driver is at stop
              status = 'at-stop';
              timeToDetention = this.formatTimeWithSeconds(hoursToDetention, minutesToDetention, secondsToDetention, ' to detention');
              duration = timeToDetention;
            }
          }
        } else if (location.departureTime && location.appointmentTime) {
          // Driver has departed and had an appointment, calculate total detention if any
          const totalDetention = await this.calculateTotalDetention(driver.id);
          if (totalDetention && totalDetention > 0) {
            detentionMinutes = totalDetention;
            detentionCost = totalDetention * 1.25; // $1.25 per minute
            duration = this.formatTime(totalDetention, ' detention (completed)');
            status = 'detention'; // Preserve detention status for completed drivers with detention
            isInDetention = true; // Mark as in detention for proper red styling
          } else {
            duration = 'Completed';
            status = 'completed'; // Only drivers without detention show as completed
          }
        } else {
          // No appointment time and no departure time - driver is not actively being tracked
          // OR has departure time but no appointment time (shouldn't happen, but safety check)
          status = 'active';
          duration = 'Standby';
          detentionMinutes = 0;
          detentionCost = 0;
          timeToDetention = '';
          isInDetention = false;
        }
      } else {
        // No location record - driver is not actively being tracked
        status = 'active';
        duration = 'Standby';
        detentionMinutes = 0;
        detentionCost = 0;
        timeToDetention = '';
        isInDetention = false;
      }

      driversWithLocations.push({
        ...driver,
        currentLocation: location || undefined,
        duration,
        status,
        detentionMinutes,
        detentionCost,
        timeToDetention,
        isInDetention,
      });
    }

    return driversWithLocations;
  }

  async getSettings(): Promise<Settings> {
    const [result] = await db.select().from(settings).limit(1);
    if (result) {
      return result;
    }
    
    // Create default settings if none exist
    const [newSettings] = await db
      .insert(settings)
      .values({ warningThresholdHours: 2, criticalThresholdHours: 3 })
      .returning();
    return newSettings;
  }

  async updateSettings(newSettings: InsertSettings): Promise<Settings> {
    const existing = await this.getSettings();
    const [updated] = await db
      .update(settings)
      .set(newSettings)
      .where(eq(settings.id, existing.id))
      .returning();
    return updated;
  }

  async getAlerts(): Promise<Alert[]> {
    const result = await db.select().from(alerts).orderBy(alerts.timestamp);
    return result;
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const [alert] = await db
      .insert(alerts)
      .values(insertAlert)
      .returning();
    return alert;
  }

  async markAlertAsRead(id: number): Promise<void> {
    await db
      .update(alerts)
      .set({ isRead: true })
      .where(eq(alerts.id, id));
  }

  async getUnreadAlerts(): Promise<Alert[]> {
    const result = await db.select().from(alerts).where(eq(alerts.isRead, false));
    return result;
  }

  async clearDriverAlerts(driverId: number): Promise<void> {
    await db.delete(alerts).where(eq(alerts.driverId, driverId));
  }

  async cleanupOrphanedAlerts(): Promise<void> {
    // Remove alerts for drivers who no longer have appointment times
    const driversWithAlerts = await db
      .select({ driverId: alerts.driverId })
      .from(alerts)
      .groupBy(alerts.driverId);

    for (const { driverId } of driversWithAlerts) {
      const location = await this.getDriverLocation(driverId);
      if (!location || !location.appointmentTime) {
        // Driver has no appointment time, clear their alerts
        await this.clearDriverAlerts(driverId);
      }
    }
  }

  async clearReadAlerts(): Promise<void> {
    await db.delete(alerts).where(eq(alerts.isRead, true));
  }

  async clearAllAlerts(): Promise<void> {
    await db.delete(alerts);
  }

  async calculateTotalDetention(driverId: number): Promise<number | null> {
    const location = await this.getDriverLocation(driverId);
    if (!location || !location.appointmentTime || !location.departureTime) {
      return null;
    }

    // Parse appointment time directly
    const appointmentTime = new Date(location.appointmentTime);
    const stopType = location.stopType || 'regular';
    
    let detentionHours = 2; // Default for regular stops
    
    // Set detention timing based on stop type
    switch (stopType) {
      case 'multi-stop':
        detentionHours = 1; // 1 hour detention
        break;
      case 'rail':
        detentionHours = 1; // 1 hour detention
        break;
      case 'no-billing':
        detentionHours = 0.25; // 15 minutes detention
        break;
      case 'drop-hook':
        detentionHours = 0.5; // 30 minutes detention
        break;
      default: // 'regular'
        detentionHours = 2; // 2 hours detention
    }
    
    const detentionStartTime = new Date(appointmentTime.getTime() + (detentionHours * 60 * 60 * 1000));
    // Parse departure time directly
    const departureTime = new Date(location.departureTime);

    if (departureTime > detentionStartTime) {
      const detentionMs = departureTime.getTime() - detentionStartTime.getTime();
      const detentionMinutes = Math.floor(detentionMs / (1000 * 60));
      return detentionMinutes;
    }
    
    return 0; // No detention if departed before detention threshold
  }
  async getDispatchers(): Promise<string[]> {
    try {
      // Get dispatchers from both drivers and standalone dispatchers table
      const drivers = await this.getDrivers();
      const driverDispatchers = Array.from(new Set(drivers.map(d => d.dispatcher))).filter(Boolean);
      
      // Get standalone dispatchers from dispatchers table
      const dispatcherRecords = await db.select().from(dispatchers).where(eq(dispatchers.isActive, true));
      const standaloneDispatchers = dispatcherRecords.map(d => d.name);
      
      // Combine and deduplicate both sources
      const allDispatchers = Array.from(new Set([...driverDispatchers, ...standaloneDispatchers]));
      return allDispatchers.sort();
    } catch (error) {
      console.error('Error getting dispatchers:', error);
      return [];
    }
  }

  async addDispatcher(name: string): Promise<void> {
    // Insert into dispatchers table for standalone dispatchers
    await db.insert(dispatchers).values({
      name: name.trim(),
      isActive: true
    }).onConflictDoNothing(); // Avoid duplicates if dispatcher already exists
  }

  async removeDispatcher(name: string): Promise<void> {
    // Mark dispatcher as inactive in dispatchers table
    await db
      .update(dispatchers)
      .set({ isActive: false })
      .where(eq(dispatchers.name, name));
  }

  // Team operations
  async getTeams(): Promise<Team[]> {
    const result = await db.select().from(teams).orderBy(teams.name);
    return result;
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const [team] = await db
      .insert(teams)
      .values(insertTeam)
      .returning();
    return team;
  }

  async updateTeam(id: number, updateData: Partial<InsertTeam>): Promise<Team | undefined> {
    const [team] = await db
      .update(teams)
      .set(updateData)
      .where(eq(teams.id, id))
      .returning();
    return team || undefined;
  }

  async deleteTeam(id: number): Promise<boolean> {
    const result = await db.delete(teams).where(eq(teams.id, id));
    return (result.rowCount || 0) > 0;
  }
}

export const storage = new DatabaseStorage();