# Pirlo Calligraphy eCoomerce GA4 Analysis with Dataform & Data Studio
This is GA4 analysis of pirlocalligraphy.com which is a Woocommerce-based ecommerce website selling Pirlo's Chinese calligaphy artworks. The events_**** tables were automatically integrated from GA4 to BigQuery on a daily basis since 30/03/2026.

## 03_outputs/ga4_events.sqlx
After this ga4_events table finishes running, what I get is a perfect event table — no nested arrays requiring manual UNNEST, extremely accurate traffic-source attribution, absolutely no duplicate data, and built-in local timezone handling plus unique IDs.

### pre_operations
According to the official GA4 documentation, event data may still be updated within 72 hours (3 days) after the event occurs. After that 72-hour window, the data is generally considered stable and unlikely to change. That’s why a 3-day threshold is used as the benchmark: data older than 3 days is treated as final, while the latest 3 days of data are reinserted to capture any updates or corrections.

### source_ga4_export
This CTE excludes intraday tables (same-day realtime tables, which are highly unstable), and uses JavaScript helper functions to filter out all blacklist rules defined in the configuration file — such as test events I do not want to track or internal testing hostnames.

### stage_unnest_params
GA4 raw tables are filled with large numbers of RECORD and ARRAY fields. This step uses the generators in helpers.js to extract information from event_params, user_properties, and even the items array, then reorganizes everything into logically structured Structs.

### stage_repack_structs
GA4 data often contains messy values — for example, the ecommerce fields may include NaN (Not a Number) values or annoying (not set) strings. This step cleans them all up by converting them into proper 0 or NULL values. In addition, starting in July 2024, GA4 moved the batch_* fields from event parameters into standalone columns, and here they are also packaged into a Struct.



