import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

export const organizations = sqliteTable('organizations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  cinOrRegistration: text('cin_or_registration'),
  gstOrTaxId: text('gst_or_tax_id'),
  address: text('address'),
  country: text('country'),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  industry: text('industry'),
  annualEmissionsBaseline: real('annual_emissions_baseline'),
  kycStatus: text('kyc_status').notNull().default('pending'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  authUserId: text('auth_user_id').notNull().unique(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  organizationId: integer('organization_id').references(() => organizations.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const carbonListings = sqliteTable('carbon_listings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  organizationId: integer('organization_id').references(() => organizations.id),
  type: text('type').notNull(),
  volumeTco2e: real('volume_tco2e').notNull(),
  pricePerTon: real('price_per_ton').notNull(),
  standard: text('standard').notNull(),
  vintageYear: integer('vintage_year').notNull(),
  location: text('location'),
  status: text('status').notNull().default('OPEN'),
  createdAt: text('created_at').notNull(),
});

export const alerts = sqliteTable('alerts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  organizationId: integer('organization_id').references(() => organizations.id),
  type: text('type').notNull(),
  message: text('message').notNull(),
  severity: text('severity').notNull(),
  isRead: integer('is_read', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull(),
});