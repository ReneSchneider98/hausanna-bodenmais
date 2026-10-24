-- Doppelbuchungen technisch unmöglich machen:
-- Zwei aktive Buchungen derselben Unterkunft dürfen sich zeitlich nicht überschneiden.
-- Zeitraum [Anreise, Abreise) – der Abreisetag ist für die nächste Anreise frei.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap"
  EXCLUDE USING gist (
    "accommodation_id" WITH =,
    daterange("arrival", "departure", '[)') WITH &&
  ) WHERE ("status" <> 'cancelled');
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_dates_valid" CHECK ("departure" > "arrival");
