#!/usr/bin/env python3
"""
Scan `assets/images/albums/` and write `data/albums.json`.

Output format (default):
{
  "album-folder": {
    "title": "Display Title",
    "images": ["1.jpg", "2.jpg"]
  },
  ...
}

Run:
  python scripts/generate_albums.py

"""
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parent.parent
ALBUMS_DIR = ROOT / 'assets' / 'images' / 'albums'
OUT_FILE = ROOT / 'data' / 'albums.json'

IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg'}


def human_title(name: str) -> str:
    # Convert folder-name or folder_name to a nicer title
    title = name.replace('-', ' ').replace('_', ' ')
    return title.strip().title()


def main():
    if not ALBUMS_DIR.exists():
        print(f"Albums directory not found: {ALBUMS_DIR}", file=sys.stderr)
        sys.exit(1)

    albums = {}
    for entry in sorted(ALBUMS_DIR.iterdir()):
        if not entry.is_dir():
            continue
        name = entry.name
        images = [p.name for p in sorted(entry.iterdir()) if p.is_file() and p.suffix.lower() in IMAGE_EXTS]
        albums[name] = {
            'title': human_title(name),
            'images': images
        }

    # write albums.json
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with OUT_FILE.open('w', encoding='utf-8') as f:
        json.dump(albums, f, ensure_ascii=False, indent=2)

    print(f'Wrote {OUT_FILE} ({len(albums)} albums)')

    # Also generate selections.json from assets/images/selections
    selections_dir = ROOT / 'assets' / 'images' / 'selections'
    selections_out = ROOT / 'data' / 'selections.json'
    selections = {}
    if selections_dir.exists():
        for entry in sorted(selections_dir.iterdir()):
            if not entry.is_dir():
                continue
            name = entry.name
            images = [p.name for p in sorted(entry.iterdir()) if p.is_file() and p.suffix.lower() in IMAGE_EXTS]
            selections[name] = {
                'title': human_title(name),
                'images': images
            }
    else:
        print(f'No selections folder at {selections_dir}, writing empty selections.json')

    with selections_out.open('w', encoding='utf-8') as f:
        json.dump(selections, f, ensure_ascii=False, indent=2)

    print(f'Wrote {selections_out} ({len(selections)} selections)')


if __name__ == '__main__':
    main()
