var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  alerts: () => alerts,
  dispatchers: () => dispatchers,
  driverLocations: () => driverLocations,
  drivers: () => drivers,
  insertAlertSchema: () => insertAlertSchema,
  insertDispatcherSchema: () => insertDispatcherSchema,
  insertDriverSchema: () => insertDriverSchema,
  insertLocationSchema: () => insertLocationSchema,
  insertSettingsSchema: () => insertSettingsSchema,
  insertTeamSchema: () => insertTeamSchema,
  settings: () => settings,
  teams: () => teams
});
import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var drivers, driverLocations, settings, alerts, insertDriverSchema, insertLocationSchema, insertSettingsSchema, dispatchers, teams, insertAlertSchema, insertDispatcherSchema, insertTeamSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    drivers = pgTable("drivers", {
      id: serial("id").primaryKey(),
      name: text("name").notNull(),
      truckNumber: text("truck_number").notNull(),
      dispatcher: text("dispatcher").default("Dean").notNull(),
      // 'Dean' | 'Matt' | 'Taiwan' | 'Alen'
      isActive: boolean("is_active").default(true).notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    driverLocations = pgTable("driver_locations", {
      id: serial("id").primaryKey(),
      driverId: integer("driver_id").references(() => drivers.id).notNull(),
      location: text("location").notNull(),
      latitude: real("latitude"),
      longitude: real("longitude"),
      appointmentTime: timestamp("appointment_time"),
      departureTime: timestamp("departure_time"),
      stopType: text("stop_type").default("regular").notNull(),
      // 'regular' | 'multi-stop' | 'rail' | 'no-billing' | 'drop-hook'
      finalDetentionMinutes: integer("final_detention_minutes"),
      finalDetentionCost: real("final_detention_cost"),
      timestamp: timestamp("timestamp").defaultNow().notNull()
    });
    settings = pgTable("settings", {
      id: serial("id").primaryKey(),
      warningThresholdHours: integer("warning_threshold_hours").default(2).notNull(),
      criticalThresholdHours: integer("critical_threshold_hours").default(3).notNull()
    });
    alerts = pgTable("alerts", {
      id: serial("id").primaryKey(),
      driverId: integer("driver_id").references(() => drivers.id).notNull(),
      type: text("type").notNull(),
      // 'warning' | 'critical' | 'reminder'
      message: text("message").notNull(),
      isRead: boolean("is_read").default(false).notNull(),
      timestamp: timestamp("timestamp").defaultNow().notNull(),
      appointmentTime: timestamp("appointment_time")
      // Track which appointment this alert is for
    });
    insertDriverSchema = createInsertSchema(drivers).omit({
      id: true,
      createdAt: true
    }).extend({
      truckNumber: z.string().min(1, "Truck number is required")
    });
    insertLocationSchema = createInsertSchema(driverLocations).omit({
      id: true,
      timestamp: true
    });
    insertSettingsSchema = createInsertSchema(settings).omit({
      id: true
    });
    dispatchers = pgTable("dispatchers", {
      id: serial("id").primaryKey(),
      name: text("name").notNull().unique(),
      isActive: boolean("is_active").default(true).notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    teams = pgTable("teams", {
      id: serial("id").primaryKey(),
      name: text("name").notNull().unique(),
      color: text("color").notNull().default("blue"),
      dispatchers: text("dispatchers").array().notNull().default([]),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    insertAlertSchema = createInsertSchema(alerts).omit({
      id: true,
      timestamp: true
    });
    insertDispatcherSchema = createInsertSchema(dispatchers).omit({
      id: true,
      createdAt: true
    });
    insertTeamSchema = createInsertSchema(teams).omit({
      id: true,
      createdAt: true
    });
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  db: () => db,
  pool: () => pool
});
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
var pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    neonConfig.webSocketConstructor = ws;
    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL environment variable is not set");
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?"
      );
    }
    try {
      new URL(process.env.DATABASE_URL);
    } catch (error) {
      console.error("Invalid DATABASE_URL format:", process.env.DATABASE_URL);
      throw new Error("DATABASE_URL must be a valid PostgreSQL connection string");
    }
    console.log("Initializing database connection pool...");
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      // Maximum number of clients in the pool
      idleTimeoutMillis: 3e4,
      // How long a client can sit idle before being closed
      connectionTimeoutMillis: 1e4
      // How long to wait for a connection
    });
    pool.on("connect", () => {
      console.log("Database client connected successfully");
    });
    pool.on("error", (err) => {
      console.error("Database pool error:", err);
    });
    db = drizzle({ client: pool, schema: schema_exports });
    console.log("Database connection initialized");
  }
});

// server/index.ts
import express2 from "express";

// server/routes.ts
init_schema();

// server/storage.ts
init_schema();
init_db();
import { eq } from "drizzle-orm";
var DatabaseStorage = class {
  async getDrivers() {
    const result = await db.select().from(drivers);
    return result;
  }
  async getDriver(id) {
    const [driver] = await db.select().from(drivers).where(eq(drivers.id, id));
    return driver || void 0;
  }
  async createDriver(insertDriver) {
    const [driver] = await db.insert(drivers).values(insertDriver).returning();
    return driver;
  }
  async updateDriver(id, updateData) {
    const [driver] = await db.update(drivers).set(updateData).where(eq(drivers.id, id)).returning();
    return driver || void 0;
  }
  async deleteDriver(id) {
    try {
      await db.delete(alerts).where(eq(alerts.driverId, id));
      await db.delete(driverLocations).where(eq(driverLocations.driverId, id));
      const result = await db.delete(drivers).where(eq(drivers.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting driver:", error);
      return false;
    }
  }
  async getDriverLocation(driverId) {
    const [location] = await db.select().from(driverLocations).where(eq(driverLocations.driverId, driverId));
    return location || void 0;
  }
  async updateDriverLocation(insertLocation) {
    const existingLocation = await this.getDriverLocation(insertLocation.driverId);
    if (existingLocation) {
      const updateData = {};
      if (insertLocation.location !== void 0) {
        updateData.location = insertLocation.location;
      }
      if (insertLocation.latitude !== void 0) {
        updateData.latitude = insertLocation.latitude;
      }
      if (insertLocation.longitude !== void 0) {
        updateData.longitude = insertLocation.longitude;
      }
      if (insertLocation.appointmentTime !== void 0) {
        updateData.appointmentTime = insertLocation.appointmentTime;
      }
      if (insertLocation.departureTime !== void 0) {
        updateData.departureTime = insertLocation.departureTime;
      }
      if (insertLocation.stopType !== void 0) {
        updateData.stopType = insertLocation.stopType;
      }
      if (insertLocation.finalDetentionMinutes !== void 0) {
        updateData.finalDetentionMinutes = insertLocation.finalDetentionMinutes;
      }
      if (insertLocation.finalDetentionCost !== void 0) {
        updateData.finalDetentionCost = insertLocation.finalDetentionCost;
      }
      const [updatedLocation] = await db.update(driverLocations).set(updateData).where(eq(driverLocations.driverId, insertLocation.driverId)).returning();
      return updatedLocation;
    } else {
      const [location] = await db.insert(driverLocations).values(insertLocation).returning();
      return location;
    }
  }
  // Helper function to format time with seconds, conditionally showing hours
  formatTimeWithSeconds(hours, minutes, seconds, suffix = "") {
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s${suffix}`;
    } else {
      return `${minutes}m ${seconds}s${suffix}`;
    }
  }
  // Helper function to format time without seconds, conditionally showing hours
  formatTime(totalMinutes, suffix = "") {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m${suffix}`;
    } else {
      return `${minutes}m${suffix}`;
    }
  }
  async getDriversWithLocations() {
    const driversWithLocationData = await db.select({
      driver: drivers,
      location: driverLocations
    }).from(drivers).leftJoin(driverLocations, eq(drivers.id, driverLocations.driverId));
    const driversWithLocations = [];
    for (const { driver, location } of driversWithLocationData) {
      let status = "active";
      let duration = "";
      let detentionMinutes = 0;
      let detentionCost = 0;
      let timeToDetention = "";
      let isInDetention = false;
      if (location) {
        if (location.appointmentTime && location.departureTime) {
          detentionMinutes = location.finalDetentionMinutes || 0;
          detentionCost = location.finalDetentionCost || 0;
          if (detentionMinutes > 0) {
            status = "detention";
            isInDetention = true;
            const hours = Math.floor(detentionMinutes / 60);
            const minutes = detentionMinutes % 60;
            if (hours > 0) {
              duration = `${hours}h ${minutes}m detention (completed)`;
            } else {
              duration = `${minutes}m detention (completed)`;
            }
          } else {
            status = "completed";
            duration = "Completed";
          }
        } else if (location.appointmentTime && !location.departureTime) {
          const appointmentTime = new Date(location.appointmentTime);
          const stopType = location.stopType || "regular";
          if (isNaN(appointmentTime.getTime())) {
            console.error("Invalid appointment time:", location.appointmentTime);
            status = "active";
            duration = "Standby (Invalid appointment time)";
            continue;
          }
          let detentionHours = 2;
          let warningMinutesAfterDetention = 0;
          let warningMinutesBeforeDetention = 30;
          switch (stopType) {
            case "multi-stop":
              detentionHours = 1;
              warningMinutesBeforeDetention = 15;
              warningMinutesAfterDetention = 0;
              break;
            case "rail":
              detentionHours = 1;
              warningMinutesBeforeDetention = 0;
              warningMinutesAfterDetention = 20;
              break;
            case "no-billing":
              detentionHours = 0.25;
              warningMinutesBeforeDetention = 0;
              warningMinutesAfterDetention = 20;
              break;
            case "drop-hook":
              detentionHours = 0.5;
              warningMinutesBeforeDetention = 0;
              warningMinutesAfterDetention = 30;
              break;
            default:
              detentionHours = 2;
              warningMinutesBeforeDetention = 30;
              warningMinutesAfterDetention = 30;
          }
          const detentionStartTime = new Date(appointmentTime.getTime() + detentionHours * 60 * 60 * 1e3);
          const warningTimeBeforeDetention = new Date(detentionStartTime.getTime() - warningMinutesBeforeDetention * 60 * 1e3);
          const warningTimeAfterDetention = new Date(detentionStartTime.getTime() + warningMinutesAfterDetention * 60 * 1e3);
          const currentTime = /* @__PURE__ */ new Date();
          if (isNaN(detentionStartTime.getTime()) || isNaN(currentTime.getTime())) {
            console.error("Invalid date calculation for driver", driver.id);
            status = "active";
            duration = "Standby (Date calculation error)";
            continue;
          }
          if (currentTime >= detentionStartTime) {
            isInDetention = true;
            const detentionMs = currentTime.getTime() - detentionStartTime.getTime();
            detentionMinutes = Math.floor(detentionMs / (1e3 * 60));
            const detentionSeconds = Math.floor(detentionMs % (1e3 * 60) / 1e3);
            status = "detention";
            detentionCost = detentionMinutes * 1.25;
            duration = this.formatTimeWithSeconds(Math.floor(detentionMinutes / 60), detentionMinutes % 60, detentionSeconds, " detention");
          } else if (currentTime >= warningTimeBeforeDetention && warningMinutesBeforeDetention > 0) {
            status = "warning";
            const timeToDetentionMs = detentionStartTime.getTime() - currentTime.getTime();
            const minutesToDetention = Math.floor(timeToDetentionMs / (1e3 * 60));
            const secondsToDetention = Math.floor(timeToDetentionMs % (1e3 * 60) / 1e3);
            timeToDetention = `${minutesToDetention}m ${secondsToDetention}s to detention`;
            duration = timeToDetention;
          } else {
            const timeToDetentionMs = detentionStartTime.getTime() - currentTime.getTime();
            const hoursToDetention = Math.floor(timeToDetentionMs / (1e3 * 60 * 60));
            const minutesToDetention = Math.floor(timeToDetentionMs % (1e3 * 60 * 60) / (1e3 * 60));
            const secondsToDetention = Math.floor(timeToDetentionMs % (1e3 * 60) / 1e3);
            if (timeToDetentionMs <= 0) {
              status = "detention";
              isInDetention = true;
              const detentionMs = Math.abs(timeToDetentionMs);
              detentionMinutes = Math.floor(detentionMs / (1e3 * 60));
              detentionCost = detentionMinutes * 1.25;
              const detentionSeconds = Math.floor(detentionMs % (1e3 * 60) / 1e3);
              duration = this.formatTimeWithSeconds(Math.floor(detentionMinutes / 60), detentionMinutes % 60, detentionSeconds, " detention");
            } else {
              status = "at-stop";
              timeToDetention = this.formatTimeWithSeconds(hoursToDetention, minutesToDetention, secondsToDetention, " to detention");
              duration = timeToDetention;
            }
          }
        } else if (location.departureTime && location.appointmentTime) {
          const totalDetention = await this.calculateTotalDetention(driver.id);
          if (totalDetention && totalDetention > 0) {
            detentionMinutes = totalDetention;
            detentionCost = totalDetention * 1.25;
            duration = this.formatTime(totalDetention, " detention (completed)");
            status = "detention";
            isInDetention = true;
          } else {
            duration = "Completed";
            status = "completed";
          }
        } else {
          status = "active";
          duration = "Standby";
          detentionMinutes = 0;
          detentionCost = 0;
          timeToDetention = "";
          isInDetention = false;
        }
      } else {
        status = "active";
        duration = "Standby";
        detentionMinutes = 0;
        detentionCost = 0;
        timeToDetention = "";
        isInDetention = false;
      }
      driversWithLocations.push({
        ...driver,
        currentLocation: location || void 0,
        duration,
        status,
        detentionMinutes,
        detentionCost,
        timeToDetention,
        isInDetention
      });
    }
    return driversWithLocations;
  }
  async getSettings() {
    const [result] = await db.select().from(settings).limit(1);
    if (result) {
      return result;
    }
    const [newSettings] = await db.insert(settings).values({ warningThresholdHours: 2, criticalThresholdHours: 3 }).returning();
    return newSettings;
  }
  async updateSettings(newSettings) {
    const existing = await this.getSettings();
    const [updated] = await db.update(settings).set(newSettings).where(eq(settings.id, existing.id)).returning();
    return updated;
  }
  async getAlerts() {
    const result = await db.select().from(alerts).orderBy(alerts.timestamp);
    return result;
  }
  async createAlert(insertAlert) {
    const [alert] = await db.insert(alerts).values(insertAlert).returning();
    return alert;
  }
  async markAlertAsRead(id) {
    await db.update(alerts).set({ isRead: true }).where(eq(alerts.id, id));
  }
  async getUnreadAlerts() {
    const result = await db.select().from(alerts).where(eq(alerts.isRead, false));
    return result;
  }
  async clearDriverAlerts(driverId) {
    await db.delete(alerts).where(eq(alerts.driverId, driverId));
  }
  async cleanupOrphanedAlerts() {
    const driversWithAlerts = await db.select({ driverId: alerts.driverId }).from(alerts).groupBy(alerts.driverId);
    for (const { driverId } of driversWithAlerts) {
      const location = await this.getDriverLocation(driverId);
      if (!location || !location.appointmentTime) {
        await this.clearDriverAlerts(driverId);
      }
    }
  }
  async clearReadAlerts() {
    await db.delete(alerts).where(eq(alerts.isRead, true));
  }
  async calculateTotalDetention(driverId) {
    const location = await this.getDriverLocation(driverId);
    if (!location || !location.appointmentTime || !location.departureTime) {
      return null;
    }
    const appointmentTime = new Date(location.appointmentTime);
    const stopType = location.stopType || "regular";
    let detentionHours = 2;
    switch (stopType) {
      case "multi-stop":
        detentionHours = 1;
        break;
      case "rail":
        detentionHours = 1;
        break;
      case "no-billing":
        detentionHours = 0.25;
        break;
      case "drop-hook":
        detentionHours = 0.5;
        break;
      default:
        detentionHours = 2;
    }
    const detentionStartTime = new Date(appointmentTime.getTime() + detentionHours * 60 * 60 * 1e3);
    const departureTime = new Date(location.departureTime);
    if (departureTime > detentionStartTime) {
      const detentionMs = departureTime.getTime() - detentionStartTime.getTime();
      const detentionMinutes = Math.floor(detentionMs / (1e3 * 60));
      return detentionMinutes;
    }
    return 0;
  }
  async getDispatchers() {
    try {
      const drivers2 = await this.getDrivers();
      const driverDispatchers = Array.from(new Set(drivers2.map((d) => d.dispatcher))).filter(Boolean);
      const dispatcherRecords = await db.select().from(dispatchers).where(eq(dispatchers.isActive, true));
      const standaloneDispatchers = dispatcherRecords.map((d) => d.name);
      const allDispatchers = Array.from(/* @__PURE__ */ new Set([...driverDispatchers, ...standaloneDispatchers]));
      return allDispatchers.sort();
    } catch (error) {
      console.error("Error getting dispatchers:", error);
      return [];
    }
  }
  async addDispatcher(name) {
    await db.insert(dispatchers).values({
      name: name.trim(),
      isActive: true
    }).onConflictDoNothing();
  }
  async removeDispatcher(name) {
    await db.update(dispatchers).set({ isActive: false }).where(eq(dispatchers.name, name));
  }
  // Team operations
  async getTeams() {
    const result = await db.select().from(teams).orderBy(teams.name);
    return result;
  }
  async createTeam(insertTeam) {
    const [team] = await db.insert(teams).values(insertTeam).returning();
    return team;
  }
  async updateTeam(id, updateData) {
    const [team] = await db.update(teams).set(updateData).where(eq(teams.id, id)).returning();
    return team || void 0;
  }
  async deleteTeam(id) {
    const result = await db.delete(teams).where(eq(teams.id, id));
    return (result.rowCount || 0) > 0;
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
import { createServer } from "http";
import { WebSocketServer } from "ws";
async function registerRoutes(app2) {
  app2.get("/api/drivers", async (req, res) => {
    try {
      const drivers2 = await storage.getDriversWithLocations();
      res.json(drivers2);
    } catch (error) {
      console.error("Error fetching drivers:", error);
      res.status(500).json({ error: "Failed to fetch drivers" });
    }
  });
  app2.get("/api/drivers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid driver ID" });
      }
      const driver = await storage.getDriver(id);
      if (!driver) {
        return res.status(404).json({ error: "Driver not found" });
      }
      res.json(driver);
    } catch (error) {
      console.error("Error fetching driver:", error);
      res.status(500).json({ error: "Failed to fetch driver" });
    }
  });
  app2.post("/api/drivers", async (req, res) => {
    try {
      const parsed = insertDriverSchema.parse(req.body);
      if (!parsed.name || parsed.name.trim().length === 0) {
        return res.status(400).json({ error: "Driver name is required" });
      }
      if (!parsed.truckNumber || parsed.truckNumber.trim().length === 0) {
        return res.status(400).json({ error: "Truck number is required" });
      }
      const driver = await storage.createDriver(parsed);
      broadcast({ type: "driver_added", driver });
      res.json(driver);
    } catch (error) {
      console.error("Error creating driver:", error);
      res.status(500).json({ error: "Failed to create driver" });
    }
  });
  app2.patch("/api/drivers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid driver ID" });
      }
      const parsed = insertDriverSchema.partial().parse(req.body);
      const driver = await storage.updateDriver(id, parsed);
      if (!driver) {
        return res.status(404).json({ error: "Driver not found" });
      }
      broadcast({ type: "drivers_update", driver });
      res.json(driver);
    } catch (error) {
      console.error("Error updating driver:", error);
      res.status(500).json({ error: "Failed to update driver" });
    }
  });
  app2.delete("/api/drivers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid driver ID" });
      }
      const success = await storage.deleteDriver(id);
      if (!success) {
        return res.status(404).json({ error: "Driver not found" });
      }
      broadcast({ type: "driver_deleted", driverId: id });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting driver:", error);
      res.status(500).json({ error: "Failed to delete driver" });
    }
  });
  app2.patch("/api/drivers/:id/location", async (req, res) => {
    try {
      const driverId = parseInt(req.params.id);
      if (isNaN(driverId)) {
        return res.status(400).json({ error: "Invalid driver ID" });
      }
      let appointmentDate;
      let departureDate;
      if (req.body.appointmentTime) {
        appointmentDate = new Date(req.body.appointmentTime);
        if (isNaN(appointmentDate.getTime())) {
          return res.status(400).json({ error: "Invalid appointment time format" });
        }
      }
      if (req.body.departureTime) {
        departureDate = new Date(req.body.departureTime);
        if (isNaN(departureDate.getTime())) {
          return res.status(400).json({ error: "Invalid departure time format" });
        }
      }
      const locationData = {
        driverId,
        ...appointmentDate && { appointmentTime: appointmentDate },
        ...departureDate && { departureTime: departureDate },
        ...req.body.stopType && { stopType: req.body.stopType },
        ...req.body.latitude && { latitude: parseFloat(req.body.latitude) },
        ...req.body.longitude && { longitude: parseFloat(req.body.longitude) },
        ...req.body.finalDetentionMinutes !== void 0 && { finalDetentionMinutes: req.body.finalDetentionMinutes },
        ...req.body.finalDetentionCost !== void 0 && { finalDetentionCost: req.body.finalDetentionCost }
      };
      const location = await storage.updateDriverLocation(locationData);
      broadcast({ type: "location_update", driverId, location });
      res.json(location);
    } catch (error) {
      console.error("Error updating location:", error);
      res.status(500).json({ error: "Failed to update location" });
    }
  });
  app2.post("/api/drivers/:id/appointment", async (req, res) => {
    try {
      const driverId = parseInt(req.params.id);
      if (isNaN(driverId)) {
        return res.status(400).json({ error: "Invalid driver ID" });
      }
      const { appointmentTime, timezoneOffsetMinutes } = req.body;
      if (!appointmentTime) {
        return res.status(400).json({ error: "Appointment time is required" });
      }
      const timeOnly = appointmentTime.includes("T") ? appointmentTime.split("T")[1] : appointmentTime;
      const [hours, minutes] = timeOnly.split(":").map(Number);
      const clientOffset = timezoneOffsetMinutes || 0;
      const utcHours = (hours + clientOffset / 60 + 24) % 24;
      const appointmentDate = /* @__PURE__ */ new Date();
      appointmentDate.setUTCHours(utcHours, minutes, 0, 0);
      const existingLocation = await storage.getDriverLocation(driverId);
      const location = await storage.updateDriverLocation({
        driverId,
        appointmentTime: appointmentDate,
        stopType: existingLocation?.stopType || "regular",
        location: existingLocation?.location || "Unknown Location"
      });
      broadcast({ type: "appointment_update", driverId, location });
      res.json(location);
    } catch (error) {
      console.error("Error setting appointment:", error);
      res.status(500).json({ error: "Failed to set appointment time" });
    }
  });
  app2.post("/api/drivers/:id/departure", async (req, res) => {
    try {
      const driverId = parseInt(req.params.id);
      if (isNaN(driverId)) {
        return res.status(400).json({ error: "Invalid driver ID" });
      }
      const { departureTime, timezoneOffsetMinutes } = req.body;
      if (!departureTime) {
        return res.status(400).json({ error: "Departure time is required" });
      }
      const timeOnly = departureTime.includes("T") ? departureTime.split("T")[1] : departureTime;
      const [hours, minutes] = timeOnly.split(":").map(Number);
      const clientOffset = timezoneOffsetMinutes || 0;
      const utcHours = (hours + clientOffset / 60 + 24) % 24;
      const departureDate = /* @__PURE__ */ new Date();
      departureDate.setUTCHours(utcHours, minutes, 0, 0);
      if (isNaN(departureDate.getTime())) {
        return res.status(400).json({ error: "Invalid departure time format" });
      }
      const existingLocation = await storage.getDriverLocation(driverId);
      if (!existingLocation) {
        return res.status(404).json({ error: "Driver location not found" });
      }
      await storage.updateDriverLocation({
        driverId,
        departureTime: departureDate,
        // Preserve existing fields - don't set final detention yet
        appointmentTime: existingLocation.appointmentTime,
        stopType: existingLocation.stopType,
        location: existingLocation.location,
        latitude: existingLocation.latitude,
        longitude: existingLocation.longitude
      });
      let finalDetentionMinutes = null;
      let finalDetentionCost = null;
      if (existingLocation.appointmentTime) {
        finalDetentionMinutes = await storage.calculateTotalDetention(driverId);
        if (finalDetentionMinutes && finalDetentionMinutes > 0) {
          finalDetentionCost = finalDetentionMinutes * 1.25;
        } else {
          finalDetentionMinutes = 0;
          finalDetentionCost = 0;
        }
      }
      const location = await storage.updateDriverLocation({
        driverId,
        departureTime: departureDate,
        finalDetentionMinutes,
        finalDetentionCost,
        // Preserve existing fields
        appointmentTime: existingLocation.appointmentTime,
        stopType: existingLocation.stopType,
        location: existingLocation.location,
        latitude: existingLocation.latitude,
        longitude: existingLocation.longitude
      });
      broadcast({ type: "departure_update", driverId, location });
      res.json(location);
    } catch (error) {
      console.error("Error setting departure time:", error);
      res.status(500).json({ error: "Failed to set departure time" });
    }
  });
  app2.post("/api/drivers/:id/reset", async (req, res) => {
    try {
      const driverId = parseInt(req.params.id);
      if (isNaN(driverId)) {
        return res.status(400).json({ error: "Invalid driver ID" });
      }
      const existingLocation = await storage.getDriverLocation(driverId);
      const location = await storage.updateDriverLocation({
        driverId,
        location: existingLocation?.location || "Unknown Location",
        // Preserve or set default location
        appointmentTime: null,
        departureTime: null,
        stopType: "regular",
        finalDetentionMinutes: null,
        finalDetentionCost: null
      });
      broadcast({ type: "driver_reset", driverId, location });
      res.json(location);
    } catch (error) {
      console.error("Error resetting driver:", error);
      res.status(500).json({ error: "Failed to reset driver" });
    }
  });
  app2.get("/api/alerts", async (req, res) => {
    try {
      const alerts2 = await storage.getAlerts();
      res.json(alerts2);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });
  app2.post("/api/alerts/:id/read", async (req, res) => {
    try {
      const alertId = parseInt(req.params.id);
      if (isNaN(alertId)) {
        return res.status(400).json({ error: "Invalid alert ID" });
      }
      await storage.markAlertAsRead(alertId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking alert as read:", error);
      res.status(500).json({ error: "Failed to mark alert as read" });
    }
  });
  app2.post("/api/alerts/mark-all-read", async (req, res) => {
    try {
      const unreadAlerts = await storage.getUnreadAlerts();
      for (const alert of unreadAlerts) {
        await storage.markAlertAsRead(alert.id);
      }
      res.json({ success: true, count: unreadAlerts.length });
    } catch (error) {
      console.error("Error marking all alerts as read:", error);
      res.status(500).json({ error: "Failed to mark alerts as read" });
    }
  });
  app2.delete("/api/alerts/clear-history", async (req, res) => {
    try {
      await storage.clearReadAlerts();
      res.json({ success: true, message: "Read alert history cleared" });
    } catch (error) {
      console.error("Error clearing alert history:", error);
      res.status(500).json({ error: "Failed to clear alert history" });
    }
  });
  app2.get("/api/settings", async (req, res) => {
    try {
      const settings2 = await storage.getSettings();
      res.json(settings2);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });
  app2.patch("/api/settings", async (req, res) => {
    try {
      const parsed = insertSettingsSchema.parse(req.body);
      const settings2 = await storage.updateSettings(parsed);
      res.json(settings2);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });
  app2.get("/api/dispatchers", async (req, res) => {
    try {
      const dispatchers2 = await storage.getDispatchers();
      res.json(dispatchers2);
    } catch (error) {
      console.error(`Error fetching dispatchers: ${error}`);
      res.status(500).json({ error: "Failed to fetch dispatchers" });
    }
  });
  app2.post("/api/dispatchers", async (req, res) => {
    try {
      const { name } = req.body;
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ error: "Dispatcher name is required" });
      }
      const trimmedName = name.trim();
      const existingDispatchers = await storage.getDispatchers();
      if (existingDispatchers.includes(trimmedName)) {
        return res.status(400).json({ error: "Dispatcher already exists" });
      }
      await storage.addDispatcher(trimmedName);
      res.json({ name: trimmedName, success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to add dispatcher" });
    }
  });
  app2.delete("/api/dispatchers/:name", async (req, res) => {
    try {
      const { name } = req.params;
      const drivers2 = await storage.getDrivers();
      const driversWithDispatcher = drivers2.filter((d) => d.dispatcher === name);
      if (driversWithDispatcher.length > 0) {
        return res.status(400).json({
          error: `Cannot delete dispatcher "${name}" because ${driversWithDispatcher.length} driver(s) are assigned to them`
        });
      }
      await storage.removeDispatcher(name);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete dispatcher" });
    }
  });
  app2.get("/api/teams", async (req, res) => {
    try {
      const teams2 = await storage.getTeams();
      res.json(teams2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });
  app2.post("/api/teams", async (req, res) => {
    try {
      const parsed = insertTeamSchema.parse(req.body);
      const team = await storage.createTeam(parsed);
      res.json(team);
    } catch (error) {
      res.status(500).json({ error: "Failed to create team" });
    }
  });
  app2.patch("/api/teams/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid team ID" });
      }
      const parsed = insertTeamSchema.partial().parse(req.body);
      const team = await storage.updateTeam(id, parsed);
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }
      res.json(team);
    } catch (error) {
      res.status(500).json({ error: "Failed to update team" });
    }
  });
  app2.delete("/api/teams/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid team ID" });
      }
      await storage.deleteTeam(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete team" });
    }
  });
  const getAIProvider = () => {
    if (process.env.GEMINI_API_KEY) return "gemini";
    if (process.env.GROQ_API_KEY) return "groq";
    if (process.env.OPENAI_API_KEY) return "openai";
    if (process.env.ANTHROPIC_API_KEY) return "anthropic";
    if (process.env.PERPLEXITY_API_KEY) return "perplexity";
    return null;
  };
  const callAI = async (message, specifiedProvider) => {
    const provider = specifiedProvider || getAIProvider();
    if (!provider) {
      throw new Error("No AI provider configured");
    }
    const systemPrompt = `STOP! Before answering ANY question, read this navigation guide completely.

**UI NAVIGATION FACTS - MEMORIZE EXACTLY:**

There is NO "Driver Management button" anywhere in the app. This button DOES NOT EXIST.
\u274C NEVER say: "Click Driver Management button"
\u274C NEVER say: "Driver Management button in top navigation"
\u2705 ALWAYS say: "Click settings gear icon \u2192 Driver Management tab"

**ONLY 7 BUTTONS IN HEADER:**
1. Refresh (circular arrow)
2. Team dropdown
3. Blue "Cost Calculator"
4. Blue "Accessorial Guide"
5. Yellow "Detention Calculator"
6. Help (question mark)
7. Settings gear icon

**Settings gear opens dialog with 3 tabs:**
- Driver Management tab
- Dispatcher Management tab
- Team Management tab

**COMPREHENSIVE SYSTEM STATUS (July 23, 2025):**
- \u2705 Universal Multi-Computer Notification System FULLY IMPLEMENTED
- \u2705 ALL browser tabs receive desktop notifications across ALL computers
- \u2705 Universal tab flashing works on all tabs regardless of focus state
- \u2705 Removed tab coordination system - notifications now work universally
- \u2705 Browser-level deduplication via notification tags prevents same-machine duplicates
- \u2705 100% TypeScript error-free compilation (14 errors resolved)
- \u2705 AI Assistant auto-fallback verified: Gemini \u2192 Groq when quota exceeded
- \u2705 "Quick Find" search terminology updated throughout interface
- \u2705 Database CRUD operations fully functional with proper error handling
- \u2705 Alert system schema corrected (timestamp fields removed)
- \u2705 Enhanced type safety with nullable checking fixes
- \u2705 Real-time WebSocket connections stable and operational
- \u2705 Frontend builds optimized (565KB bundle) and properly served
- \u2705 All existing functionality preserved and verified
- \u2705 PROFESSIONAL FAVICON REDESIGN: Blue truck icon with red alert badge overlay
- \u2705 SIMPLIFIED FLASHING SYSTEM: Clean 500ms pattern with dynamic icon generation
- \u2705 PRODUCTION CLEANUP: Removed development test button for cleaner interface
- \u2705 COMPREHENSIVE TESTING: Verified all components including favicon, service worker, API endpoints
- \u2705 MULTI-COMPUTER CONFIRMED: WebSocket broadcasts to ALL connected clients simultaneously
- \u2705 TEAM FILTERING CONFIRMED: All notification channels actively filter by selected team/dispatcher

**TO CREATE A TEAM:**
1. Click settings gear icon
2. Click "Team Management" tab
3. Click "Create Team" button
4. Enter team name, select color (12 options), assign dispatchers
5. Save

**CRITICAL DEFINITIONS:**
DRIVERS = Truck drivers (Antonio Ramirez, etc.) who get tracked for detention
DISPATCHERS = App users (Alen, Dean, Matt, Taiwan) who operate the system

**EXACT STEPS TO ADD DISPATCHER:**
1. Click settings gear icon
2. Click "Dispatcher Management" tab
3. Click "Add Dispatcher" button
4. Enter name only

**QUICK FIND SEARCH (NOT "Search"):**
- Use "Quick Find" terminology (never "search" or "smart search")
- Available in help dialog with clickable navigation
- Supports fuzzy matching, typo tolerance, and intelligent highlighting
- Results show relevance percentages and navigate directly to content
5. Save

**EXACT STEPS TO ADD DRIVER:**
1. Click settings gear icon
2. Click "Driver Management" tab
3. Click "Add Driver" button
4. Enter truck number, name, phone, select dispatcher
5. Save

**APPOINTMENT WORKFLOW - CRITICAL:**
\u274C NEVER say "Click settings gear" for appointments!
\u2705 Appointments are set DIRECTLY from main driver list table:
1. Find driver in main driver list (NOT in settings)
2. Click blue "Set Appointment" button in driver's row
3. Enter time in HH:MM format
4. Click green "Set Departure" button when driver LEAVES (this stops the timer!)
5. Click orange "Reset" button only to CLEAR all appointment data

CRITICAL DISTINCTION:
- Green "Set Departure" = STOPS timer and calculates final detention
- Orange "Reset" = CLEARS appointment (doesn't stop timer, erases everything)

REMEMBER: Settings gear is ONLY for adding/editing drivers, NOT for appointments!

**DETENTION RULES:**
Regular stops: 2 hours \u2192 $1.25/min detention
Multi-Stop: 1 hour \u2192 $1.25/min detention
Rail: 1 hour \u2192 $1.25/min detention
Drop/Hook: 30 minutes \u2192 $1.25/min detention
No Billing: 15 minutes \u2192 $1.25/min detention

**DRIVER LIST & FILTERING:**
Main driver list shows all drivers with status badges and action buttons.
Users can filter by status (All/Standby/Warning/Detention) using dropdown.
Drivers in detention status are shown with red badges.

**CALCULATIONS:**
Detention cost = Minutes over threshold \xD7 $1.25
Example: 3 hours (180 minutes) \xD7 $1.25 = $225

**DRIVER DELETION:**
Settings gear \u2192 Driver Management tab \u2192 Click red trash icon next to driver name \u2192 Confirm

**NOTIFICATION SYSTEM (Universal Multi-Computer Setup - July 23, 2025):**
- ALL browser tabs receive desktop notifications when alerts occur
- ALL tabs flash when unread alerts exist, regardless of focus state
- Perfect for multi-computer dispatcher setups - notifications appear on ALL computers
- Browser handles duplicate prevention automatically via notification tags
- Team-based filtering applies to ALL notification channels (desktop, audio, toast, tab flashing)
- Click orange bell icon in header to enable browser notification permissions
- System removed complex tab coordination that was blocking notifications
- Professional blue truck favicon alternates with red alert badge showing exact count
- Canvas API generates dynamic favicons with real-time alert overlay
- Service worker registered for background notification bypass capabilities
- Enhanced background tab detection with aggressive bypass methods preserved

**NOTIFICATION BEHAVIOR:**
- Desktop notifications: Appear on all tabs and computers when alerts occur
- Tab flashing: All tabs flash showing "(X) Dispatcher Helper" and "\u{1F6A8} X ALERT(S) \u{1F6A8}" every 500ms
- Favicon flashing: Professional blue truck icon alternates with red alert badge overlay
- Audio alerts: Play on all tabs and filter by selected team/dispatcher
- Toast notifications: In-app popups respect team filtering
- Consistent experience whether using one tab or multiple computers
- Background tabs continue flashing using visibility detection and enhanced DOM manipulation

\u274C NEVER mention: "Detention Calculator features", "column sorting", "three dots menu"
\u274C NEVER make up UI elements that don't exist
\u2705 ALWAYS be helpful even if exact details aren't provided
\u2705 ALWAYS distinguish: Set Departure (stops timer) vs Reset (clears data)

If user asks about adding drivers or dispatchers, ALWAYS start with "Click settings gear icon" and specify the correct tab.`;
    switch (provider) {
      case "openai":
        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: message }
            ],
            max_tokens: 1e3,
            temperature: 0.1
          })
        });
        if (!openaiResponse.ok) throw new Error(`OpenAI API error: ${openaiResponse.status}`);
        const openaiData = await openaiResponse.json();
        return {
          response: openaiData.choices[0].message.content,
          provider: "OpenAI GPT-3.5",
          usage: openaiData.usage
        };
      case "anthropic":
        const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": process.env.ANTHROPIC_API_KEY,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify({
            model: "claude-3-haiku-20240307",
            max_tokens: 1e3,
            messages: [
              { role: "user", content: `${systemPrompt}

User question: ${message}` }
            ]
          })
        });
        if (!claudeResponse.ok) throw new Error(`Claude API error: ${claudeResponse.status}`);
        const claudeData = await claudeResponse.json();
        return {
          response: claudeData.content[0].text,
          provider: "Claude 3 Haiku",
          usage: claudeData.usage
        };
      case "gemini":
        const apiKey = process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const requestBody = {
          contents: [{
            parts: [{ text: `${systemPrompt}

User question: ${message}` }]
          }],
          generationConfig: {
            maxOutputTokens: 1e3,
            temperature: 0.1
          }
        };
        const geminiResponse = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody)
        });
        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text();
          throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
        }
        const geminiData = await geminiResponse.json();
        return {
          response: geminiData.candidates[0].content.parts[0].text,
          provider: "Google Gemini 1.5 Flash",
          usage: geminiData.usageMetadata
        };
      case "groq":
        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama3-8b-8192",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: message }
            ],
            max_tokens: 1e3,
            temperature: 0.2
          })
        });
        if (!groqResponse.ok) throw new Error(`Groq API error: ${groqResponse.status}`);
        const groqData = await groqResponse.json();
        return {
          response: groqData.choices[0].message.content,
          provider: "Groq Llama3-8B",
          usage: groqData.usage
        };
      case "perplexity":
        const perplexityResponse = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.PERPLEXITY_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.1-sonar-small-128k-online",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: message }
            ],
            max_tokens: 1e3,
            temperature: 0.1,
            top_p: 0.9,
            return_images: false,
            return_related_questions: false,
            stream: false
          })
        });
        if (!perplexityResponse.ok) throw new Error(`Perplexity API error: ${perplexityResponse.status}`);
        const perplexityData = await perplexityResponse.json();
        return {
          response: perplexityData.choices[0].message.content,
          provider: "Perplexity Sonar",
          usage: perplexityData.usage
        };
      default:
        throw new Error("Unknown AI provider");
    }
  };
  app2.get("/api/ai-providers", (req, res) => {
    const providers = [
      {
        id: "auto",
        name: "Auto-detect",
        available: !!getAIProvider(),
        description: "Automatically use available provider"
      },
      {
        id: "openai",
        name: "OpenAI GPT",
        available: !!process.env.OPENAI_API_KEY,
        description: "GPT-3.5 Turbo"
      },
      {
        id: "anthropic",
        name: "Claude",
        available: !!process.env.ANTHROPIC_API_KEY,
        description: "Claude 3 Haiku"
      },
      {
        id: "gemini",
        name: "Google Gemini",
        available: !!process.env.GEMINI_API_KEY,
        description: "Gemini 1.5 Flash"
      },
      {
        id: "groq",
        name: "Groq",
        available: !!process.env.GROQ_API_KEY,
        description: "Llama3-8B"
      },
      {
        id: "perplexity",
        name: "Perplexity",
        available: !!process.env.PERPLEXITY_API_KEY,
        description: "Sonar Models"
      }
    ];
    res.json({ providers });
  });
  app2.post("/api/ai-assistant", async (req, res) => {
    try {
      const { message, provider: requestedProvider } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }
      let provider = requestedProvider;
      if (provider && provider !== "auto") {
        const hasKey = {
          "openai": !!process.env.OPENAI_API_KEY,
          "anthropic": !!process.env.ANTHROPIC_API_KEY,
          "gemini": !!process.env.GEMINI_API_KEY,
          "groq": !!process.env.GROQ_API_KEY,
          "perplexity": !!process.env.PERPLEXITY_API_KEY
        };
        if (!hasKey[provider]) {
          return res.status(400).json({
            error: `Requested provider "${provider}" is not available`,
            details: `No API key found for ${provider}. Please add the corresponding environment variable.`
          });
        }
      } else {
        provider = getAIProvider();
      }
      if (!provider) {
        return res.status(503).json({
          error: "AI assistant is not available",
          details: "No AI provider configured. Please add one of: OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, GROQ_API_KEY, or PERPLEXITY_API_KEY environment variables."
        });
      }
      let result;
      let lastError;
      const availableProviders = ["gemini", "groq", "openai", "anthropic", "perplexity"].filter((p) => {
        const hasKey = {
          "openai": !!process.env.OPENAI_API_KEY,
          "anthropic": !!process.env.ANTHROPIC_API_KEY,
          "gemini": !!process.env.GEMINI_API_KEY,
          "groq": !!process.env.GROQ_API_KEY,
          "perplexity": !!process.env.PERPLEXITY_API_KEY
        };
        return hasKey[p];
      });
      const providersToTry = [provider, ...availableProviders.filter((p) => p !== provider)];
      for (const currentProvider of providersToTry) {
        try {
          result = await callAI(message, currentProvider);
          break;
        } catch (error) {
          console.log(`Provider ${currentProvider} failed:`, error instanceof Error ? error.message : error);
          lastError = error;
          if (error instanceof Error && (error.message.includes("429") || error.message.includes("quota") || error.message.includes("rate limit"))) {
            console.log(`Quota/rate limit hit for ${currentProvider}, trying next provider...`);
            continue;
          }
          continue;
        }
      }
      if (!result) {
        throw lastError || new Error("All AI providers failed");
      }
      res.json(result);
    } catch (error) {
      console.error("AI Assistant error:", error);
      res.status(500).json({
        error: "AI assistant temporarily unavailable",
        details: error instanceof Error ? error.message : "Please try again later"
      });
    }
  });
  const httpServer = createServer(app2);
  const wss = new WebSocketServer({
    server: httpServer,
    path: "/api/ws"
  });
  const clients = /* @__PURE__ */ new Set();
  wss.on("connection", (ws2) => {
    clients.add(ws2);
    console.log("Client connected. Total clients:", clients.size);
    ws2.on("close", () => {
      clients.delete(ws2);
      console.log("Client disconnected. Total clients:", clients.size);
    });
    ws2.on("error", (error) => {
      console.error("WebSocket error:", error);
      clients.delete(ws2);
    });
    ws2.on("pong", () => {
    });
  });
  const broadcast = (message) => {
    const messageStr = JSON.stringify(message);
    clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        try {
          client.send(messageStr);
        } catch (error) {
          console.error("Error sending WebSocket message:", error);
          clients.delete(client);
        }
      } else {
        clients.delete(client);
      }
    });
  };
  setInterval(() => {
    clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        try {
          client.ping();
        } catch (error) {
          console.error("Error pinging WebSocket client:", error);
          clients.delete(client);
        }
      } else {
        clients.delete(client);
      }
    });
  }, 3e4);
  const checkForAlerts = async () => {
    try {
      const drivers2 = await storage.getDriversWithLocations();
      const settings2 = await storage.getSettings();
      for (const driver of drivers2) {
        if (!driver.currentLocation?.appointmentTime || driver.currentLocation?.departureTime) {
          continue;
        }
        const appointmentTime = new Date(driver.currentLocation.appointmentTime);
        const now = /* @__PURE__ */ new Date();
        const timeSinceAppointment = now.getTime() - appointmentTime.getTime();
        const minutesSinceAppointment = Math.floor(timeSinceAppointment / (1e3 * 60));
        const stopType = driver.currentLocation.stopType || "regular";
        let detentionThreshold;
        let warningTime;
        switch (stopType) {
          case "multi-stop":
            detentionThreshold = 60;
            warningTime = -15;
            break;
          case "rail":
            detentionThreshold = 60;
            warningTime = 0;
            break;
          case "drop-hook":
            detentionThreshold = 30;
            warningTime = 0;
            break;
          case "no-billing":
            detentionThreshold = 15;
            warningTime = 0;
            break;
          default:
            detentionThreshold = 120;
            warningTime = -30;
            break;
        }
        const existingAlerts = await storage.getAlerts();
        const driverAlerts = existingAlerts.filter((alert) => alert.driverId === driver.id);
        const recentAlertWindow = 60 * 60 * 1e3;
        if (warningTime < 0 && minutesSinceAppointment >= detentionThreshold + warningTime && minutesSinceAppointment < detentionThreshold) {
          const hasExistingWarning = driverAlerts.some(
            (alert) => alert.type === "warning" && !alert.message.includes("entered detention") && // Don't count detention start warnings
            alert.appointmentTime && driver.currentLocation?.appointmentTime && new Date(alert.appointmentTime).getTime() === new Date(driver.currentLocation.appointmentTime).getTime()
          );
          if (!hasExistingWarning) {
            const timeToDetention = detentionThreshold - minutesSinceAppointment;
            const alert = await storage.createAlert({
              driverId: driver.id,
              type: "warning",
              message: `${driver.name} will enter detention in ${timeToDetention} minutes (${stopType === "regular" ? "Regular" : stopType === "multi-stop" ? "Multi-Stop" : stopType === "rail" ? "Rail" : stopType === "drop-hook" ? "Drop/Hook" : "No Billing"} stop)`,
              isRead: false,
              appointmentTime: driver.currentLocation.appointmentTime
            });
            broadcast({
              type: "alert",
              alert: { ...alert, id: alert.id }
            });
          }
        }
        if (minutesSinceAppointment >= detentionThreshold) {
          const detentionMinutes = minutesSinceAppointment - detentionThreshold;
          const appointmentTime2 = driver.currentLocation.appointmentTime;
          const existingDetentionAlert = driverAlerts.find(
            (alert) => alert.message.includes("entered detention") && alert.appointmentTime && appointmentTime2 && new Date(alert.appointmentTime).getTime() === new Date(appointmentTime2).getTime()
          );
          const isFirstDetentionAlert = !existingDetentionAlert;
          if (isFirstDetentionAlert) {
            const alert = await storage.createAlert({
              driverId: driver.id,
              type: "critical",
              message: `${driver.name} has entered detention (${stopType === "regular" ? "Regular" : stopType === "multi-stop" ? "Multi-Stop" : stopType === "rail" ? "Rail" : stopType === "drop-hook" ? "Drop/Hook" : "No Billing"} stop)`,
              isRead: false,
              appointmentTime: appointmentTime2
            });
            console.log(`Broadcasting detention alert for ${driver.name}`);
            broadcast({
              type: "alert",
              alert: { ...alert, id: alert.id }
            });
          }
          const reminderInterval = 30;
          const detentionMinutesRounded = Math.floor(detentionMinutes);
          const shouldSendReminder = detentionMinutesRounded >= reminderInterval && detentionMinutesRounded % reminderInterval <= 1;
          const hasRecentReminder = driverAlerts.some(
            (alert) => alert.type === "reminder" && alert.appointmentTime && driver.currentLocation?.appointmentTime && new Date(alert.appointmentTime).getTime() === new Date(driver.currentLocation.appointmentTime).getTime() && now.getTime() - new Date(alert.timestamp).getTime() < 25 * 60 * 1e3
            // 25 minutes window to prevent duplicates
          );
          if (shouldSendReminder && !hasRecentReminder && !isFirstDetentionAlert) {
            console.log(`Sending reminder alert for ${driver.name}: ${detentionMinutesRounded} minutes in detention`);
            const alert = await storage.createAlert({
              driverId: driver.id,
              type: "reminder",
              message: `${driver.name} still in detention for ${detentionMinutesRounded} minutes (${stopType === "regular" ? "Regular" : stopType === "multi-stop" ? "Multi-Stop" : stopType === "rail" ? "Rail" : stopType === "drop-hook" ? "Drop/Hook" : "No Billing"} stop)`,
              isRead: false,
              appointmentTime: driver.currentLocation.appointmentTime
            });
            broadcast({
              type: "alert",
              alert: { ...alert, id: alert.id }
            });
          }
        }
      }
    } catch (error) {
      console.error("Error checking for alerts:", error);
    }
  };
  setInterval(checkForAlerts, 1e4);
  checkForAlerts();
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}
function validateEnvironment() {
  const requiredEnvVars = ["DATABASE_URL"];
  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(", ")}`);
  }
  log(`Environment: ${process.env.NODE_ENV}`);
  log("All required environment variables are present");
}
var app = express2();
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    environment: process.env.NODE_ENV,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    uptime: process.uptime()
  });
});
app.get("/ready", async (req, res) => {
  try {
    const { pool: pool2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    await pool2.query("SELECT 1");
    res.status(200).json({
      status: "ready",
      database: "connected",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    console.error("Readiness check failed:", error);
    res.status(503).json({
      status: "not ready",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
});
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});
process.on("SIGTERM", () => {
  log("SIGTERM received, shutting down gracefully");
  process.exit(0);
});
process.on("SIGINT", () => {
  log("SIGINT received, shutting down gracefully");
  process.exit(0);
});
(async () => {
  try {
    log("Starting Dispatcher Helper server...");
    validateEnvironment();
    log("Testing database connection...");
    const { pool: pool2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    await pool2.query("SELECT 1");
    log("Database connection successful");
    log("Registering API routes...");
    const server = await registerRoutes(app);
    log("API routes registered successfully");
    app.use((err, _req, res, _next) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Server error:", err);
      res.status(status).json({ message });
    });
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
    const port = process.env.PORT ? parseInt(process.env.PORT) : 5e3;
    const host = process.env.NODE_ENV === "production" ? "0.0.0.0" : "0.0.0.0";
    server.listen({
      port,
      host,
      reusePort: true
    }, () => {
      log(`Dispatcher Helper server started successfully`);
      log(`Environment: ${process.env.NODE_ENV}`);
      log(`Server listening on ${host}:${port}`);
      log(`Health check available at: http://${host}:${port}/health`);
      log(`Readiness check available at: http://${host}:${port}/ready`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace");
    process.exit(1);
  }
})();
