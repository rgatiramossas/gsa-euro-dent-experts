import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users (admin and technicians)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  role: text("role").notNull().default("technician"), // "admin" or "technician"
  profile_image: text("profile_image"),
  active: boolean("active").notNull().default(true),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  created_at: true 
});

// Clients
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  created_at: true
});

// Vehicles
export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  client_id: integer("client_id").notNull().references(() => clients.id),
  make: text("make").notNull(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  color: text("color"),
  license_plate: text("license_plate"),
  vin: text("vin"),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertVehicleSchema = createInsertSchema(vehicles).omit({
  id: true,
  created_at: true
});

// Service Types
export const serviceTypes = pgTable("service_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  base_price: doublePrecision("base_price"),
});

export const insertServiceTypeSchema = createInsertSchema(serviceTypes).omit({
  id: true
});

// Service status: "pending", "completed", "aguardando_aprovacao", "faturado", "pago"
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  client_id: integer("client_id").notNull().references(() => clients.id),
  vehicle_id: integer("vehicle_id").notNull().references(() => vehicles.id),
  service_type_id: integer("service_type_id").notNull().references(() => serviceTypes.id),
  technician_id: integer("technician_id").references(() => users.id),
  status: text("status").notNull().default("pending"),
  description: text("description"),
  scheduled_date: timestamp("scheduled_date"),
  start_date: timestamp("start_date"),
  completion_date: timestamp("completion_date"),
  location_type: text("location_type").notNull(), // "client_location" or "workshop"
  address: text("address"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  price: doublePrecision("price"),
  displacement_fee: doublePrecision("displacement_fee").default(0),
  total: doublePrecision("total"),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertServiceSchema = createInsertSchema(services)
  .omit({
    id: true,
    created_at: true
  })
  .extend({
    // Permitir que a data agendada seja uma string ISO (para compatibilidade com frontend)
    scheduled_date: z.string().or(z.date()).nullable().optional(),
    start_date: z.string().or(z.date()).nullable().optional(),
    completion_date: z.string().or(z.date()).nullable().optional(),
  });

// Service Photos
export const servicePhotos = pgTable("service_photos", {
  id: serial("id").primaryKey(),
  service_id: integer("service_id").notNull().references(() => services.id),
  photo_type: text("photo_type").notNull(), // "before" or "after"
  photo_url: text("photo_url").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertServicePhotoSchema = createInsertSchema(servicePhotos).omit({
  id: true,
  created_at: true
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;

export type ServiceType = typeof serviceTypes.$inferSelect;
export type InsertServiceType = z.infer<typeof insertServiceTypeSchema>;

export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;

export type ServicePhoto = typeof servicePhotos.$inferSelect;
export type InsertServicePhoto = z.infer<typeof insertServicePhotoSchema>;
