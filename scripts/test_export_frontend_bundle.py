import csv
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from export_frontend_bundle import export_bundle


class FrontendBundleExportTests(unittest.TestCase):
    def write_csv(self, root: Path, name: str, rows: list[dict[str, str]]) -> None:
        path = root / name
        with path.open('w', encoding='utf-8', newline='') as handle:
            writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
            writer.writeheader()
            writer.writerows(rows)

    def test_exports_joined_poem_and_graphs(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            data_dir = Path(temp) / 'data'
            data_dir.mkdir()
            self.write_csv(data_dir, 'poems.csv', [{
                'poem_id': 'p1', 'title': '春晓', 'poet_id': 'author1', 'poetic_form': '五言绝句',
                'period': '盛唐', 'full_text': '春眠不觉晓，\n处处闻啼鸟。', 'source_id': 's1',
                'source_locator': 'fixture', 'review_status': 'pending',
            }])
            self.write_csv(data_dir, 'poem_lines.csv', [
                {'line_id': 'l2', 'poem_id': 'p1', 'line_no': '2', 'line_text': '处处闻啼鸟。'},
                {'line_id': 'l1', 'poem_id': 'p1', 'line_no': '1', 'line_text': '春眠不觉晓，'},
            ])
            self.write_csv(data_dir, 'poets.csv', [{
                'poet_id': 'author1', 'name': '孟浩然', 'courtesy_name': '浩然', 'art_name': '',
                'birth_year': '689', 'death_year': '740', 'birthplace_id': '', 'biography': '诗人',
                'source_id': 's1', 'source_locator': 'fixture', 'review_status': 'pending',
            }])
            self.write_csv(data_dir, 'sources.csv', [{
                'source_id': 's1', 'source_type': 'fixture', 'title': 'Fixture', 'url': 'https://example.com',
                'review_status': 'pending',
            }])
            self.write_csv(data_dir, 'tags.csv', [{'tag_id': 't1', 'tag_name': '春日', 'category': 'theme', 'review_status': 'approved'}])
            self.write_csv(data_dir, 'poem_tags.csv', [{
                'poem_tag_id': 'pt1', 'tag_id': 't1', 'poem_id': 'p1', 'review_status': 'approved',
            }])
            self.write_csv(data_dir, 'imagery.csv', [{'imagery_id': 'i1', 'canonical_name': '春', 'category': '季节', 'review_status': 'approved'}])
            self.write_csv(data_dir, 'poem_imagery.csv', [{
                'poem_imagery_id': 'pi1', 'imagery_id': 'i1', 'poem_id': 'p1', 'surface_form': '春', 'review_status': 'approved',
            }])
            for name, headers in {
                'color_occurrences.csv': ['color_occurrence_id', 'poem_id', 'color_term', 'normalized_color', 'review_status'],
                'technique_annotations.csv': ['technique_annotation_id', 'poem_id', 'technique_tag_id', 'quote', 'review_status'],
                'places.csv': ['place_id', 'historical_name', 'modern_name', 'place_type', 'longitude', 'latitude', 'review_status'],
                'poem_places.csv': ['poem_place_id', 'place_id', 'poem_id', 'relation_type', 'review_status'],
                'poet_relations.csv': ['poet_relation_id', 'from_poet_id', 'to_poet_id', 'relation_type', 'evidence_poem_id', 'review_status'],
                'prosody_annotations.csv': ['prosody_annotation_id', 'poem_id', 'annotation_type', 'pattern', 'rhyme_system', 'review_status'],
                'poet_schools.csv': ['poet_school_id', 'poet_id', 'school_tag_id', 'review_status'],
                'annotation_reviews.csv': ['review_id', 'target_table', 'target_id', 'decision', 'review_status'],
            }.items():
                self.write_csv(data_dir, name, [{header: '' for header in headers}])

            output = Path(temp) / 'bundle.json'
            export_bundle(data_dir, output)
            bundle = json.loads(output.read_text(encoding='utf-8'))

            self.assertEqual(bundle['meta']['poemCount'], 1)
            self.assertEqual([line['text'] for line in bundle['poems'][0]['lines']], ['春眠不觉晓，', '处处闻啼鸟。'])
            self.assertEqual(bundle['poems'][0]['themes'], ['春日'])
            self.assertEqual(bundle['poems'][0]['imagery'], ['春'])
            periods = {period['id']: period for period in bundle['graphs']['timeline']['periods']}
            self.assertEqual(periods['盛唐']['poemCount'], 1)
            self.assertEqual(bundle['graphs']['imagery']['nodes'][0]['poemCount'], 1)
            self.assertEqual(bundle['meta']['unresolvedReferenceCount'], 0)


if __name__ == '__main__':
    unittest.main()
