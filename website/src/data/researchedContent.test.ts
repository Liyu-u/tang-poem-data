import { describe, expect, it } from 'vitest';
import { allJournalPoets, journalExtraPoets } from '../sections/journal/journalData';
import { getPoetryChronology } from '../sections/journal/journalChronology';
import { researchedAuthors } from './researchedContent';
import { starProfile } from '../sections/poets/starProfiles';

describe('sourced content coverage', () => {
  it('replaces all 21 pending dossiers with attributed text and reading material', () => {
    expect(journalExtraPoets).toHaveLength(21);
    for (const poet of journalExtraPoets) {
      expect(JSON.stringify(poet)).not.toMatch(/待补充|待上传|资料待核实/);
      expect(poet.works.length).toBeGreaterThan(0);
      expect(poet.profile?.biography).toBeTruthy();
      expect(poet.profile?.milestones?.length, poet.name).toBeGreaterThan(0);
      expect(poet.profile?.connections?.length, poet.name).toBeGreaterThan(0);
      expect(poet.sources?.length).toBeGreaterThan(0);
    }
  });
  it('provides a complete source inventory for every selectable dossier', () => {
    for (const poet of allJournalPoets) {
      const chronology = getPoetryChronology(poet);
      expect(chronology, poet.name).not.toBeNull();
      expect(chronology!.works.length + chronology!.excludedTotal).toBe(chronology!.indexedTotal);
      expect(new Set(chronology!.works.map(work => work.id)).size).toBe(chronology!.works.length);
    }
  });
  it('covers all 80 stars without presenting guessed annotation tags', () => {
    expect(Object.keys(researchedAuthors)).toHaveLength(80);
    for (const author of Object.values(researchedAuthors)) {
      expect(author.biography, author.name).toBeTruthy();
      expect(author.works?.length, author.name).toBeGreaterThan(0);
      expect(starProfile(author.name).style).not.toMatch(/待考/);
      expect(author.works?.every(work => work.sourceUrl && work.text)).toBe(true);
    }
  });
});

