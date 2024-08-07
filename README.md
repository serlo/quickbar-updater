# quickbar-updater

Update: 2024-01-29

Script to process data for quickbar

![grafik](https://github.com/serlo/quickbar-updater/assets/13507950/573054eb-9880-4a73-ac17-1f26073239b2)

## Getting started

To run script locally, clone this repo and run `yarn`. You also need an API-Key for simple analytices. Create an `.env` file with it:

```
SA_KEY=sa_api_key_...
```

The script contains of 4 independant parts

### yarn 1-fetch

output: v2_current_de_serlo.org_visits.csv

about ~160mb, takes about 1 - 2 minutes to download

### yarn 2-extract

input: v2_current_de_serlo.org_visits.csv

output: quicklinks.json

a few secs

### yarn 3-metadata

input: quicklinks.json, (cache of metadata)

output: \_output/meta_data.json

takes 10 - 15 minutes to not overflow API

### yarn 4-process

input: meta_data.json

output: quickbar.json

the final output, available at https://serlo.github.io/quickbar-updater/quickbar.json

### yarn 4-sitemap

input: meta_data.json

output: sitemap.json

output the sitemap (seo) as well. Available at https://serlo.github.io/quickbar-updater/sitemap.json
