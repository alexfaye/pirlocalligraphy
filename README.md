# Pirlo Calligraphy eCoomerce GA4 Analysis with Dataform & Data Studio
This is GA4 analysis of pirlocalligraphy.com which is a Woocommerce-based ecommerce website selling Pirlo's Chinese calligaphy artworks. The events_**** tables were automatically integrated from GA4 to BigQuery on a daily basis since 30/03/2026.

## ga4_events.sqlx
After this ga4_events table finishes running, what you get is a perfect event table — no nested arrays requiring manual UNNEST, extremely accurate traffic-source attribution, absolutely no duplicate data, and built-in local timezone handling plus unique IDs.

| CTE                               |                                                        |
| --------------------------------- | ------------------------------------------------------ |
| pre_operations                    | GA4 may update historical data retrospectively.        |


