import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const drivers = pgTable("drivers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  truckNumber: text("truck_number").notNull(),
  dispatcher: text("dispatcher").default("Dean").notNull(), // 'Dean' | 'Matt' | 'Taiwan' | 'Alen'
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const driverLocations = pgTable("driver_locations", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").references(() => drivers.id).notNull(),
  location: text("location").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  appointmentTime: timestamp("appointment_time"),
  departureTime: timestamp("departure_time"),
  stopType: text("stop_type").default("regular").notNull(), // 'regular' | 'multi-stop' | 'rail' | 'no-billing' | 'drop-hook'
  finalDetentionMinutes: integer("final_detention_minutes"),
  finalDetentionCost: real("final_detention_cost"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  warningThresholdHours: integer("warning_threshold_hours").default(2).notNull(),
  criticalThresholdHours: integer("critical_threshold_hours").default(3).notNull(),
});

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").references(() => drivers.id).notNull(),
  type: text("type").notNull(), // 'warning' | 'critical' | 'reminder'
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  appointmentTime: timestamp("appointment_time"), // Track which appointment this alert is for
});

export const insertDriverSchema = createInsertSchema(drivers).omit({
  id: true,
  createdAt: true,
}).extend({
  truckNumber: z.string().min(1, "Truck number is required"),
});

export const insertLocationSchema = createInsertSchema(driverLocations).omit({
  id: true,
  timestamp: true,
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
});

export const dispatchers = pgTable("dispatchers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("blue"),
  dispatchers: text("dispatchers").array().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  timestamp: true,
});

export const insertDispatcherSchema = createInsertSchema(dispatchers).omit({
  id: true,
  createdAt: true,
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
});

export type Driver = typeof drivers.$inferSelect;
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type DriverLocation = typeof driverLocations.$inferSelect;
export type InsertDriverLocation = z.infer<typeof insertLocationSchema>;
export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Dispatcher = typeof dispatchers.$inferSelect;
export type InsertDispatcher = z.infer<typeof insertDispatcherSchema>;
export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;

export type DriverWithLocation = Driver & {
  currentLocation?: DriverLocation;
  duration?: string;
  status: 'active' | 'warning' | 'critical' | 'detention' | 'at-stop' | 'completed';
  detentionMinutes?: number;
  detentionCost?: number;
  timeToDetention?: string;
  isInDetention?: boolean;
};
