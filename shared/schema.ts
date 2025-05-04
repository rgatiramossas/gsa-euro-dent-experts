import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, time, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
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
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
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
  vehicle_id: integer("vehicle_id").references(() => vehicles.id), // Não mais obrigatório
  // Novos campos para veículo manual
  vehicle_make: text("vehicle_make"),
  vehicle_model: text("vehicle_model"),
  vehicle_plate: text("vehicle_plate"),
  vehicle_vin: text("vehicle_vin"),  // Chassi
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

// Budgets (orçamentos)
export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  client_id: integer("client_id").notNull().references(() => clients.id),
  vehicle_info: text("vehicle_info").notNull(),
  date: text("date").notNull(),
  total_aw: integer("total_aw"),
  total_value: doublePrecision("total_value"),
  photo_url: text("photo_url"),
  note: text("note"),
  plate: text("plate"),
  chassisNumber: text("chassis_number"),
  vehicle_image: text("vehicle_image"), // Campo para armazenar a imagem do veículo em base64
  damaged_parts: jsonb("damaged_parts"), // Campo para armazenar os danos em formato JSON
  created_at: timestamp("created_at").defaultNow(),
});

export const insertBudgetSchema = createInsertSchema(budgets).omit({
  id: true,
  created_at: true
});

export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = z.infer<typeof insertBudgetSchema>;

// Define relations between tables
export const usersRelations = relations(users, ({ many }) => ({
  services: many(services),
  events: many(events),
  paymentRequests: many(paymentRequests),
  managerClientAssignments: many(managerClientAssignments),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  vehicles: many(vehicles),
  services: many(services),
  managerClientAssignments: many(managerClientAssignments),
  budgets: many(budgets),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  client: one(clients, {
    fields: [vehicles.client_id],
    references: [clients.id],
  }),
  services: many(services),
}));

export const serviceTypesRelations = relations(serviceTypes, ({ many }) => ({
  services: many(services),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  client: one(clients, {
    fields: [services.client_id],
    references: [clients.id],
  }),
  vehicle: one(vehicles, {
    fields: [services.vehicle_id],
    references: [vehicles.id],
  }),
  serviceType: one(serviceTypes, {
    fields: [services.service_type_id],
    references: [serviceTypes.id],
  }),
  technician: one(users, {
    fields: [services.technician_id],
    references: [users.id],
  }),
  photos: many(servicePhotos),
  paymentRequestItems: many(paymentRequestItems),
}));

export const servicePhotosRelations = relations(servicePhotos, ({ one }) => ({
  service: one(services, {
    fields: [servicePhotos.service_id],
    references: [services.id],
  }),
}));

export const eventTypesRelations = relations(eventTypes, ({ many }) => ({
  events: many(events),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  eventType: one(eventTypes, {
    fields: [events.event_type_id],
    references: [eventTypes.id],
  }),
  technician: one(users, {
    fields: [events.technician_id],
    references: [users.id],
  }),
}));

export const paymentRequestsRelations = relations(paymentRequests, ({ one, many }) => ({
  technician: one(users, {
    fields: [paymentRequests.technician_id],
    references: [users.id],
  }),
  items: many(paymentRequestItems),
}));

export const paymentRequestItemsRelations = relations(paymentRequestItems, ({ one }) => ({
  paymentRequest: one(paymentRequests, {
    fields: [paymentRequestItems.payment_request_id],
    references: [paymentRequests.id],
  }),
  service: one(services, {
    fields: [paymentRequestItems.service_id],
    references: [services.id],
  }),
}));

export const managerClientAssignmentsRelations = relations(managerClientAssignments, ({ one }) => ({
  manager: one(users, {
    fields: [managerClientAssignments.manager_id],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [managerClientAssignments.client_id],
    references: [clients.id],
  }),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  client: one(clients, {
    fields: [budgets.client_id],
    references: [clients.id],
  }),
}));
