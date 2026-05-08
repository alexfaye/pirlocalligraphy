# Pirlo Calligraphy eCoomerce GA4 Analysis with Dataform & Data Studio
This is GA4 analysis of pirlocalligraphy.com which is a Woocommerce-based ecommerce website selling Pirlo's Chinese calligaphy artworks. The events_**** tables were automatically integrated from GA4 to BigQuery on a daily basis since 30/03/2026.

## ga4_events.sqlx
After this ga4_events table finishes running, what we get is a perfect event table — no nested arrays requiring manual UNNEST, extremely accurate traffic-source attribution, absolutely no duplicate data, and built-in local timezone handling plus unique IDs.

### pre_operations
According to the official GA4 documentation, event data may still be updated within 72 hours (3 days) after the event occurs. After that 72-hour window, the data is generally considered stable and unlikely to change. That’s why a 3-day threshold is used as the benchmark: data older than 3 days is treated as final, while the latest 3 days of data are reinserted to capture any updates or corrections.

