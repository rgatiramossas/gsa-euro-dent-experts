import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, time, jsonb } from "drizzle-orm/pg-core";
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
  role: text("role").notNull().default("technician"), // "admin", "technician" ou "gestor"
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
  administrative_fee: doublePrecision("administrative_fee").default(0), // Comissão para o administrador
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
  photo_type: text("photo_type").notNull(), // "before", "after", or "service"
  photo_url: text("photo_url").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertServicePhotoSchema = createInsertSchema(servicePhotos).omit({
  id: true,
  created_at: true
}).extend({
  photo_type: z.enum(['before', 'after', 'service'])
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

// Event Types (reunião, visita, serviço, etc.)
export const eventTypes = pgTable("event_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#4f46e5"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertEventTypeSchema = createInsertSchema(eventTypes).omit({
  id: true,
  created_at: true
});

// Events (not directly related to services)
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  date: text("date").notNull(), // YYYY-MM-DD format
  time: text("time").notNull(), // HH:MM format
  duration: integer("duration").notNull().default(60), // in minutes
  event_type_id: integer("event_type_id").notNull().references(() => eventTypes.id),
  technician_id: integer("technician_id").notNull().references(() => users.id),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  created_at: true
});

export type EventType = typeof eventTypes.$inferSelect;
export type InsertEventType = z.infer<typeof insertEventTypeSchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

// Payment Requests
export const paymentRequests = pgTable("payment_requests", {
  id: serial("id").primaryKey(),
  technician_id: integer("technician_id").notNull().references(() => users.id),
  created_at: timestamp("created_at").defaultNow(),
  status: text("status").notNull().default("pending"),
  payment_date: timestamp("payment_date"),
  payment_details: text("payment_details"),
});

export const paymentRequestItems = pgTable("payment_request_items", {
  id: serial("id").primaryKey(),
  payment_request_id: integer("payment_request_id").notNull().references(() => paymentRequests.id),
  service_id: integer("service_id").notNull().references(() => services.id),
});

export const insertPaymentRequestSchema = createInsertSchema(paymentRequests).omit({
  id: true,
  created_at: true,
});

export const insertPaymentRequestItemSchema = createInsertSchema(paymentRequestItems).omit({
  id: true,
});

// Expenses
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // "salario", "aluguel", "compra_material", etc.
  amount: doublePrecision("amount").notNull(),
  date: timestamp("date").notNull(),
  description: text("description").notNull(),
  payment_method: text("payment_method").notNull(),
  provider: text("provider"),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  created_at: true
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

export type PaymentRequest = typeof paymentRequests.$inferSelect;
export type InsertPaymentRequest = z.infer<typeof insertPaymentRequestSchema>;
export type PaymentRequestItem = typeof paymentRequestItems.$inferSelect;
export type InsertPaymentRequestItem = z.infer<typeof insertPaymentRequestItemSchema>;

// Gestores de Clientes - Associação entre gestores e clientes
export const managerClientAssignments = pgTable("manager_client_assignments", {
  id: serial("id").primaryKey(),
  manager_id: integer("manager_id").notNull().references(() => users.id),
  client_id: integer("client_id").notNull().references(() => clients.id),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertManagerClientAssignmentSchema = createInsertSchema(managerClientAssignments).omit({
  id: true,
  created_at: true
});

export type ManagerClientAssignment = typeof managerClientAssignments.$inferSelect;
export type InsertManagerClientAssignment = z.infer<typeof insertManagerClientAssignmentSchema>;
