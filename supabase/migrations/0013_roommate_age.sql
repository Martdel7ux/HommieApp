-- Roommate profiles: optional age, shown on the browse card ("Elena K., 22").
alter table roommate_preferences
  add column if not exists age smallint;

alter table roommate_preferences
  drop constraint if exists roommate_preferences_age_check;

alter table roommate_preferences
  add constraint roommate_preferences_age_check
  check (age is null or age between 16 and 99);
