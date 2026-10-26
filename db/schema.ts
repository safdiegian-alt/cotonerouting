import { sqliteTable, text, real, integer, index, primaryKey } from 'drizzle-orm/sqlite-core';
export const contacts=sqliteTable('contacts',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),name:text('name').notNull(),aliases:text('aliases').notNull(),address:text('address').notNull(),mapsUrl:text('maps_url'),placeId:text('place_id'),city:text('city').notNull(),lat:real('lat'),lon:real('lon'),confirmed:integer('confirmed').notNull().default(0),updated:text('updated').notNull()
},t=>[index('contacts_owner_idx').on(t.owner)]);

export const googleApiUsage=sqliteTable('google_api_usage',{owner:text('owner').notNull(),kind:text('kind').notNull(),window:integer('window').notNull(),used:integer('used').notNull().default(0)},t=>[primaryKey({columns:[t.owner,t.kind,t.window]}),index('google_usage_window_idx').on(t.window)]);

export const dailyEdits=sqliteTable('daily_edits',{owner:text('owner').notNull(),day:text('day').notNull(),movementKey:text('movement_key').notNull(),data:text('data').notNull(),updated:text('updated').notNull()},t=>[primaryKey({columns:[t.owner,t.day,t.movementKey]})]);
