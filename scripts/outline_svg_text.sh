#!/bin/bash
SVG_DIR="/Users/pannitto/Downloads/KODAnnai_main/public"
FILES=(
  "GRAND_MAP_fornavigate.svg"
  "GRAND_MAP_fornavigate_dark.svg"
  "Bekkan_MAP_fornavigate.svg"
  "Bekkan_MAP_fornavigate_dark.svg"
  "Chibikko_MAP_fornavigate.svg"
  "Chibikko_MAP_fornavigate_dark.svg"
  "Main_building_MAP_fornavigate.svg"
  "Main_building_MAP_fornavigate_dark.svg"
)

for f in "${FILES[@]}"; do
  INPUT="$SVG_DIR/$f"
  echo "Processing: $f"
  inkscape "$INPUT" --export-text-to-path --export-plain-svg --export-filename="$INPUT"
  echo "Done: $f"
done
