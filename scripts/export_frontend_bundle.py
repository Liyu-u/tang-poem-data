"""Build a browser-friendly bundle from the normalized Tang-poem CSV tables."""

from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


PERIOD_ORDER = ['初唐', '盛唐', '中唐', '晚唐', '待考']


def read_csv(data_dir: Path, filename: str) -> list[dict[str, str]]:
    path = data_dir / filename
    if not path.exists():
        return []
    with path.open('r', encoding='utf-8-sig', newline='') as handle:
        return list(csv.DictReader(handle))


def value(row: dict[str, str], key: str, default: str = '') -> str:
    return (row.get(key) or default).strip()


def number_or_none(raw: str) -> int | None:
    raw = raw.strip()
    return int(raw) if raw else None


def review_status(row: dict[str, str]) -> str:
    return value(row, 'review_status') or 'pending'


def export_bundle(data_dir: Path, output_path: Path) -> dict[str, Any]:
    poems_rows = read_csv(data_dir, 'poems.csv')
    lines_rows = read_csv(data_dir, 'poem_lines.csv')
    poets_rows = read_csv(data_dir, 'poets.csv')
    sources_rows = read_csv(data_dir, 'sources.csv')
    tags_rows = read_csv(data_dir, 'tags.csv')
    poem_tags_rows = read_csv(data_dir, 'poem_tags.csv')
    imagery_rows = read_csv(data_dir, 'imagery.csv')
    poem_imagery_rows = read_csv(data_dir, 'poem_imagery.csv')
    color_rows = read_csv(data_dir, 'color_occurrences.csv')
    technique_rows = read_csv(data_dir, 'technique_annotations.csv')
    places_rows = read_csv(data_dir, 'places.csv')
    poem_places_rows = read_csv(data_dir, 'poem_places.csv')
    relation_rows = read_csv(data_dir, 'poet_relations.csv')
    prosody_rows = read_csv(data_dir, 'prosody_annotations.csv')

    poem_by_id = {value(row, 'poem_id'): row for row in poems_rows if value(row, 'poem_id')}
    poet_by_id = {value(row, 'poet_id'): row for row in poets_rows if value(row, 'poet_id')}
    tag_by_id = {value(row, 'tag_id'): row for row in tags_rows if value(row, 'tag_id')}
    imagery_by_id = {value(row, 'imagery_id'): row for row in imagery_rows if value(row, 'imagery_id')}
    place_by_id = {value(row, 'place_id'): row for row in places_rows if value(row, 'place_id')}

    lines_by_poem: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in lines_rows:
        poem_id = value(row, 'poem_id')
        if poem_id in poem_by_id:
            lines_by_poem[poem_id].append({
                'id': value(row, 'line_id'),
                'lineNo': number_or_none(value(row, 'line_no')) or 0,
                'coupletNo': number_or_none(value(row, 'couplet_no')),
                'text': value(row, 'line_text'),
                'reviewStatus': review_status(row),
            })
    for lines in lines_by_poem.values():
        lines.sort(key=lambda line: (line['lineNo'], line['id']))

    approved_tags_by_poem: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in poem_tags_rows:
        if review_status(row) != 'approved':
            continue
        tag = tag_by_id.get(value(row, 'tag_id'))
        poem_id = value(row, 'poem_id')
        if tag and poem_id in poem_by_id:
            approved_tags_by_poem[poem_id].append({
                'id': value(row, 'poem_tag_id'),
                'tagId': value(row, 'tag_id'),
                'name': value(tag, 'tag_name'),
                'category': value(tag, 'category'),
                'quote': value(row, 'quote'),
                'explanation': value(row, 'explanation'),
                'confidence': float(value(row, 'confidence') or 0),
                'reviewStatus': review_status(row),
            })

    approved_imagery_by_poem: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in poem_imagery_rows:
        if review_status(row) != 'approved':
            continue
        imagery = imagery_by_id.get(value(row, 'imagery_id'))
        poem_id = value(row, 'poem_id')
        if imagery and poem_id in poem_by_id:
            approved_imagery_by_poem[poem_id].append({
                'id': value(row, 'poem_imagery_id'),
                'imageryId': value(row, 'imagery_id'),
                'name': value(imagery, 'canonical_name'),
                'category': value(imagery, 'category'),
                'surfaceForm': value(row, 'surface_form'),
                'quote': value(row, 'quote'),
                'explanation': value(row, 'explanation'),
                'contextualMeaning': value(row, 'contextual_meaning'),
                'confidence': float(value(row, 'confidence') or 0),
                'reviewStatus': review_status(row),
            })

    approved_colors_by_poem: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in color_rows:
        if review_status(row) == 'approved' and value(row, 'poem_id') in poem_by_id:
            approved_colors_by_poem[value(row, 'poem_id')].append({
                'term': value(row, 'color_term'),
                'normalizedColor': value(row, 'normalized_color'),
                'hex': value(row, 'color_hex'),
                'quote': value(row, 'quote'),
                'usageType': value(row, 'usage_type'),
                'reviewStatus': review_status(row),
            })

    approved_techniques_by_poem: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in technique_rows:
        if review_status(row) != 'approved' or value(row, 'poem_id') not in poem_by_id:
            continue
        tag = tag_by_id.get(value(row, 'technique_tag_id'))
        approved_techniques_by_poem[value(row, 'poem_id')].append({
            'id': value(row, 'technique_annotation_id'),
            'tagId': value(row, 'technique_tag_id'),
            'name': value(tag, 'tag_name') if tag else value(row, 'technique_tag_id'),
            'quote': value(row, 'quote'),
            'explanation': value(row, 'explanation'),
            'effect': value(row, 'effect'),
            'confidence': float(value(row, 'confidence') or 0),
            'reviewStatus': review_status(row),
        })

    approved_places_by_poem: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in poem_places_rows:
        if review_status(row) != 'approved':
            continue
        place = place_by_id.get(value(row, 'place_id'))
        poem_id = value(row, 'poem_id')
        if place and poem_id in poem_by_id:
            approved_places_by_poem[poem_id].append({
                'id': value(row, 'place_id'),
                'name': value(place, 'historical_name') or value(place, 'modern_name'),
                'modernName': value(place, 'modern_name'),
                'relationType': value(row, 'relation_type'),
                'longitude': float(value(place, 'longitude') or 0),
                'latitude': float(value(place, 'latitude') or 0),
                'reviewStatus': review_status(row),
            })

    poems: list[dict[str, Any]] = []
    for row in poems_rows:
        poem_id = value(row, 'poem_id')
        lines = lines_by_poem.get(poem_id, [])
        tags = approved_tags_by_poem.get(poem_id, [])
        imagery = approved_imagery_by_poem.get(poem_id, [])
        poems.append({
            'id': poem_id,
            'title': value(row, 'title'),
            'poetId': value(row, 'poet_id'),
            'period': value(row, 'period') or '待考',
            'poeticForm': value(row, 'poetic_form') or '待考',
            'fullText': value(row, 'full_text'),
            'lines': lines,
            'themes': sorted({item['name'] for item in tags if item['category'] == 'theme'}),
            'imagery': sorted({item['name'] for item in imagery}),
            'colors': sorted({item['normalizedColor'] or item['term'] for item in approved_colors_by_poem.get(poem_id, []) if item['normalizedColor'] or item['term']}),
            'techniques': sorted({item['name'] for item in approved_techniques_by_poem.get(poem_id, [])}),
            'annotations': {
                'tags': tags,
                'imagery': imagery,
                'colors': approved_colors_by_poem.get(poem_id, []),
                'techniques': approved_techniques_by_poem.get(poem_id, []),
                'places': approved_places_by_poem.get(poem_id, []),
            },
            'sourceId': value(row, 'source_id'),
            'sourceLocator': value(row, 'source_locator'),
            'reviewStatus': review_status(row),
        })

    poets: list[dict[str, Any]] = []
    period_by_poet: dict[str, str] = {}
    poem_ids_by_poet: dict[str, list[str]] = defaultdict(list)
    for poem in poems:
        poem_ids_by_poet[poem['poetId']].append(poem['id'])
        period_by_poet.setdefault(poem['poetId'], poem['period'])
    for row in poets_rows:
        poet_id = value(row, 'poet_id')
        poets.append({
            'id': poet_id,
            'name': value(row, 'name'),
            'courtesyName': value(row, 'courtesy_name'),
            'artName': value(row, 'art_name'),
            'birthYear': number_or_none(value(row, 'birth_year')),
            'deathYear': number_or_none(value(row, 'death_year')),
            'biography': value(row, 'biography'),
            'period': period_by_poet.get(poet_id, '待考'),
            'poemIds': sorted(poem_ids_by_poet.get(poet_id, [])),
            'sourceId': value(row, 'source_id'),
            'sourceLocator': value(row, 'source_locator'),
            'reviewStatus': review_status(row),
        })

    sources = [{
        'id': value(row, 'source_id'),
        'type': value(row, 'source_type'),
        'title': value(row, 'title'),
        'url': value(row, 'url'),
        'rights': value(row, 'rights'),
        'reviewStatus': review_status(row),
    } for row in sources_rows if value(row, 'source_id')]

    places = [{
        'id': value(row, 'place_id'),
        'historicalName': value(row, 'historical_name'),
        'modernName': value(row, 'modern_name'),
        'type': value(row, 'place_type'),
        'longitude': float(value(row, 'longitude') or 0),
        'latitude': float(value(row, 'latitude') or 0),
        'reviewStatus': review_status(row),
    } for row in places_rows if value(row, 'place_id')]

    imagery_nodes: dict[str, dict[str, Any]] = {}
    imagery_poem_ids: dict[str, set[str]] = defaultdict(set)
    for poem_id, entries in approved_imagery_by_poem.items():
        for entry in entries:
            imagery_id = entry['imageryId']
            imagery_poem_ids[imagery_id].add(poem_id)
            imagery_nodes.setdefault(imagery_id, {
                'id': imagery_id,
                'name': entry['name'],
                'category': entry['category'],
                'poemIds': [],
                'poemCount': 0,
                'reviewStatus': 'approved',
            })
    for imagery_id, poem_ids in imagery_poem_ids.items():
        imagery_nodes[imagery_id]['poemIds'] = sorted(poem_ids)
        imagery_nodes[imagery_id]['poemCount'] = len(poem_ids)

    imagery_link_poems: dict[tuple[str, str], set[str]] = defaultdict(set)
    for poem_id, entries in approved_imagery_by_poem.items():
        ids = sorted({entry['imageryId'] for entry in entries})
        for index, source in enumerate(ids):
            for target in ids[index + 1:]:
                imagery_link_poems[(source, target)].add(poem_id)
    imagery_links = [{
        'source': source,
        'target': target,
        'poemIds': sorted(poem_ids),
        'poemCount': len(poem_ids),
        'reviewStatus': 'approved',
    } for (source, target), poem_ids in sorted(imagery_link_poems.items())]

    timeline_periods = []
    for period in PERIOD_ORDER:
        period_poems = [poem for poem in poems if poem['period'] == period]
        timeline_periods.append({
            'id': period,
            'poemCount': len(period_poems),
            'poetIds': sorted({poem['poetId'] for poem in period_poems}),
        })
    timeline = {
        'periods': timeline_periods,
        'poets': [{
            'id': poet['id'], 'name': poet['name'], 'period': poet['period'],
            'poemCount': len(poet['poemIds']),
        } for poet in poets],
        'poems': [{
            'id': poem['id'], 'title': poem['title'], 'period': poem['period'], 'poetId': poem['poetId'],
        } for poem in poems],
    }

    known_ids = set(poem_by_id) | set(poet_by_id) | set(tag_by_id) | set(imagery_by_id) | set(place_by_id)
    unresolved: list[dict[str, str]] = []
    for table, rows, source_key, target_key in [
        ('poem_tags', poem_tags_rows, 'tag_id', 'tag_id'),
        ('poem_imagery', poem_imagery_rows, 'imagery_id', 'imagery_id'),
        ('poem_places', poem_places_rows, 'place_id', 'place_id'),
    ]:
        for row in rows:
            if value(row, source_key) and value(row, source_key) not in known_ids:
                unresolved.append({'table': table, 'id': value(row, source_key), 'target': target_key})

    meta = {
        'version': 'frontend-bundle-v1',
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'poemCount': len(poems),
        'poetCount': len(poets),
        'lineCount': sum(len(poem['lines']) for poem in poems),
        'sourceCount': len(sources),
        'approvedThemePoemCount': len(approved_tags_by_poem),
        'approvedImageryPoemCount': len(approved_imagery_by_poem),
        'approvedColorPoemCount': len(approved_colors_by_poem),
        'approvedTechniquePoemCount': len(approved_techniques_by_poem),
        'unresolvedReferenceCount': len(unresolved),
    }
    bundle = {
        'meta': meta,
        'poems': poems,
        'poets': poets,
        'sources': sources,
        'imagery': [{
            'id': value(row, 'imagery_id'),
            'name': value(row, 'canonical_name'),
            'category': value(row, 'category'),
            'reviewStatus': review_status(row),
        } for row in imagery_rows if value(row, 'imagery_id')],
        'tags': [{
            'id': value(row, 'tag_id'),
            'name': value(row, 'tag_name'),
            'category': value(row, 'category'),
            'reviewStatus': review_status(row),
        } for row in tags_rows if value(row, 'tag_id')],
        'places': places,
        'graphs': {
            'timeline': timeline,
            'imagery': {
                'nodes': sorted(imagery_nodes.values(), key=lambda node: (-node['poemCount'], node['name'])),
                'links': imagery_links,
            },
        },
        'quality': {
            'unresolvedReferences': unresolved,
            'pendingRelationCount': sum(review_status(row) != 'approved' for row in relation_rows),
            'pendingProsodyCount': sum(review_status(row) != 'approved' for row in prosody_rows),
        },
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(bundle, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return bundle


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data-dir', type=Path, default=Path(__file__).resolve().parents[1] / 'data')
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[2] / 'src/data/generated/tang-poem.json')
    args = parser.parse_args()
    bundle = export_bundle(args.data_dir, args.output)
    manifest_path = args.data_dir.parent / 'reports/frontend_bundle_manifest.json'
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(bundle['meta'], ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(bundle['meta'], ensure_ascii=False))


if __name__ == '__main__':
    main()
