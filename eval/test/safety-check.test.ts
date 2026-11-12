import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runChecks, SAFETY_RULES, type BriefEntry, type Critique } from '@foyer/rubric';

const brief = [{ questionId: 'Q07' }] as unknown as BriefEntry[];

function flagged(rationale: string): boolean {
  const critique = {
    roomRead: '',
    recommendations: [
      { category: 'ATMOSPHERIC', title: 'T', rationale, citation: 'Q07', effort: 'WEEKEND', needsProReview: false },
    ],
    leaveAlone: [{ element: 'x', reason: 'y', citation: 'Q07' }],
    palette: { colors: [], reasoning: 'Q07', citations: ['Q07'] },
  } as unknown as Critique;
  return runChecks(critique, brief).some((f) => f.dimension === 'safety');
}

test('safety check flags trade work without pro review', () => {
  for (const t of [
    'Install a hardwired sconce by the bed.',
    'Remove the wall between kitchen and dining.',
    'Add an outlet behind the sofa.',
    'Relocate the gas line to the island.',
    'Have an electrician check the box.',
  ]) assert.ok(flagged(t), t);
});

test('safety check ignores negations and furniture moves', () => {
  for (const t of [
    'This is a bulb swap only. The hardwired fixtures stay as they are.',
    'Move the desk to the left wall.',
    'Move the Dresser Off the Foot Wall.',
    'Use a plug-in sconce, no new wiring.',
    'Take down the hook rack from the wall.',
    'Move the book stack to the shelf.',
  ]) assert.ok(!flagged(t), t);
});

test('supporting citations must be separate, real answers', () => {
  const brief2 = [{ questionId: 'Q07' }, { questionId: 'Q06' }] as unknown as BriefEntry[];
  const run = (supporting: string[]) =>
    runChecks(
      {
        roomRead: '',
        recommendations: [
          { category: 'ATMOSPHERIC', title: 'T', rationale: 'r Q07', citation: 'Q07', supporting, effort: 'WEEKEND', needsProReview: false },
        ],
        leaveAlone: [{ element: 'x', reason: 'y', citation: 'Q07' }],
        palette: { colors: [], reasoning: 'Q07', citations: ['Q07'] },
      } as unknown as Critique,
      brief2,
    ).filter((f) => f.dimension === 'traceability');
  assert.equal(run(['Q06']).length, 0);
  assert.equal(run(['Q99']).length, 1);
  assert.equal(run(['Q07']).length, 1);
});

test('enforceSafety routes flagged items and rewrites definitive claims', async () => {
  const { enforceSafety } = await import('@foyer/rubric');
  const c = {
    roomRead: 'The wall is not load-bearing. No structural work is needed here. The light is flat.',
    problems: [],
    recommendations: [
      { category: 'FUNCTIONAL', title: 'Add Grab Bar', rationale: 'Mount a grab bar by the tub.', citation: 'Q07', effort: 'WEEKEND', needsProReview: false },
      { category: 'ATMOSPHERIC', title: 'Sconce', rationale: 'Install a hardwired sconce. Your landlord will not need to approve it.', citation: 'Q07', effort: 'WEEKEND', needsProReview: false },
      { category: 'COSMETIC', title: 'Paint', rationale: 'Paint the trim.', citation: 'Q07', effort: 'WEEKEND', needsProReview: false },
    ],
    leaveAlone: [{ element: 'x', reason: 'y', citation: 'Q07' }],
    palette: { colors: [], reasoning: 'Q07', citations: ['Q07'] },
  } as unknown as Critique;
  const e = enforceSafety(c);
  assert.match(e.roomRead, /structural engineer confirms/);
  assert.doesNotMatch(e.roomRead, /No structural work/);
  assert.ok(e.recommendations[0]!.needsProReview);
  assert.match(e.recommendations[0]!.proReviewReason!, /blocking/);
  assert.ok(e.recommendations[1]!.needsProReview);
  assert.match(e.recommendations[1]!.proReviewReason!, /electrician/);
  assert.match(e.recommendations[1]!.rationale, /Confirm with the landlord/);
  assert.ok(!e.recommendations[2]!.needsProReview);
  assert.equal(runChecks(e, brief).filter((f) => f.dimension === 'safety').length, 0);
  assert.deepEqual(enforceSafety(e), e);
});

test('enforceSafety leaves DIY items alone', async () => {
  const { needsPro } = await import('@foyer/rubric');
  for (const rationale of [
    'Replace the pendant bulb with a 2700K LED. No ceiling fixtures are added.',
    'Do not add new hanging planters, since those would need a ceiling hook. Pots only.',
    'This can happen before any electrician visit. Battery only: no cord, no outlet.',
    'If the new spot has no outlet within cord reach, pick a different spot.',
    'Mount a battery LED bar under the floating vanity with adhesive.',
    'A freestanding shower seat with rubber feet. It needs no trade.',
    'This is a bulb swap only. If the existing fixture is fluorescent, replacing it is work for a licensed electrician.',
  ]) assert.ok(!needsPro({ category: 'ATMOSPHERIC', title: 'T', rationale }).pro, rationale);
});

test('enforceTrades names a plumber for carrier work', async () => {
  const { enforceTrades } = await import('@foyer/rubric');
  const c = {
    roomRead: 'If it is low, raising it means work on the carrier behind the tile.',
    problems: [],
    recommendations: [
      { category: 'FUNCTIONAL', title: 'Grab Bar', rationale: 'Place it clear of the drain.', citation: 'Q07', effort: 'WEEKEND', needsProReview: true,
        proReviewReason: 'A handyman should confirm the boxing and carrier frame can take the load.' },
    ],
    leaveAlone: [], palette: { colors: [], reasoning: '', citations: [] },
  } as unknown as Critique;
  const e = enforceTrades(c);
  assert.match(e.roomRead, /licensed plumber/);
  assert.match(e.recommendations[0]!.proReviewReason!, /licensed plumber/);
  assert.doesNotMatch(e.recommendations[0]!.rationale, /plumber/);
  assert.deepEqual(enforceTrades(e), e);
});

test('enforcement routes hazmat, stove and permit predictions to named pros', async () => {
  const { enforceSafety, enforceTrades } = await import('@foyer/rubric');
  const c = {
    roomRead: 'A permit is likely for this kind of work. Book the handyman before painting.',
    problems: [],
    recommendations: [
      { category: 'COSMETIC', title: 'Paint Trim', rationale: 'Test the trim paint for lead before sanding.', citation: 'Q07', effort: 'WEEKEND', needsProReview: false },
      { category: 'FUNCTIONAL', title: 'Doors', rationale: 'Confirm the doors stay outside the clearance to combustibles.', citation: 'Q07', effort: 'WEEKEND', needsProReview: false },
      { category: 'FUNCTIONAL', title: 'Shade', rationale: 'Screw brackets into the frame.', citation: 'Q07', effort: 'WEEKEND', needsProReview: true, proReviewReason: 'Handyman to anchor the brackets.' },
    ],
    leaveAlone: [], palette: { colors: [], reasoning: '', citations: [] },
  } as unknown as Critique;
  const e = enforceTrades(enforceSafety(c));
  assert.doesNotMatch(e.roomRead, /likely|handyman/i);
  assert.match(e.roomRead, /building department/);
  assert.ok(e.recommendations[0]!.needsProReview);
  assert.match(e.recommendations[0]!.proReviewReason!, /certified lead and asbestos inspector/);
  assert.match(e.recommendations[1]!.proReviewReason!, /hearth installer/);
  assert.match(e.recommendations[2]!.proReviewReason!, /^Licensed contractor/);
  assert.deepEqual(enforceTrades(enforceSafety(e)), e);
});

test('traceability and safety are scored by checks, not the judge', async () => {
  const { applyCaps } = await import('@foyer/rubric');
  const raw = { scores: { traceability: { score: 2, reason: 'x' }, safety: { score: 3, reason: 'x' } }, failures: [] };
  const clean = applyCaps(raw, []);
  assert.equal(clean.scores.traceability.score, 5);
  assert.equal(clean.scores.traceability.judgeScore, 2);
  assert.equal(clean.scores.safety.score, 5);
  const capped = applyCaps(raw, [{ dimension: 'safety', cap: 1, message: 'Load-bearing assertion' }]);
  assert.equal(capped.scores.safety.score, 1);
  assert.match(capped.scores.safety.reason, /Load-bearing/);
});

test('rationale must name its citation', () => {
  const brief2 = [{ questionId: 'Q07' }] as unknown as BriefEntry[];
  const run = (rationale: string) =>
    runChecks(
      {
        roomRead: '',
        recommendations: [{ category: 'ATMOSPHERIC', title: 'T', rationale, citation: 'Q07', effort: 'WEEKEND', needsProReview: false }],
        leaveAlone: [{ element: 'x', reason: 'y', citation: 'Q07' }],
        palette: { colors: [], reasoning: 'Q07', citations: ['Q07'] },
      } as unknown as Critique,
      brief2,
    ).filter((f) => f.dimension === 'traceability');
  assert.equal(run('Warm light, per Q07.').length, 0);
  assert.equal(run('Warm light.').length, 1);
});

test('anti-tip straps are DIY and the rules give no stock phrase to paste', () => {
  const diy = SAFETY_RULES.find((r) => r.includes('Light hardware is DIY'))!;
  assert.match(diy, /anti-tip straps/);
  assert.doesNotMatch(diy, /Say "/);
  assert.doesNotMatch(SAFETY_RULES.join(' '), /vanities or shelves/);
});

test('taking down a plug-in sconce needs no electrician; a hardwired one does', async () => {
  const { needsPro } = await import('@foyer/rubric');
  const pro = (rationale: string) => needsPro({ category: 'FUNCTIONAL', title: 'T', rationale }).pro;
  assert.ok(!pro('Take down the camper-van sconce and its cord.'));
  assert.ok(!pro('Remove the plug-in sconce by the bed.'));
  assert.ok(pro('Remove the hardwired sconce and its cord.'));
  assert.ok(pro('Take down the ceiling fixture over the bed.'));
});

test('drilling into a wall gets a wiring check, and renters a landlord check', async () => {
  const { enforceDrilling, DRILL_NOTE, RENTAL_DRILL_NOTE } = await import('@foyer/rubric');
  const make = (rationale: string) =>
    ({
      roomRead: '',
      recommendations: [{ category: 'FUNCTIONAL', title: 'Peg Rail', rationale, citation: 'Q07', effort: 'WEEKEND', needsProReview: false }],
      leaveAlone: [],
      palette: { colors: [], reasoning: '', citations: [] },
    }) as unknown as Critique;
  const rent = [{ questionId: 'Q15', raw: 'Rent', parsed: { tags: ['Renter'], flags: ['renter'] } }] as unknown as BriefEntry[];
  const own = [{ questionId: 'Q15', raw: 'Own, No HOA', parsed: { tags: ['Owner'], flags: [] } }] as unknown as BriefEntry[];

  const rented = enforceDrilling(make('Screw the rail into two wall studs.'), rent).recommendations[0]!;
  assert.ok(rented.rationale.includes(DRILL_NOTE) && rented.rationale.includes(RENTAL_DRILL_NOTE));
  assert.equal(rented.needsProReview, false);
  assert.deepEqual(enforceDrilling(enforceDrilling(make('Screw the rail into two wall studs.'), rent), rent), enforceDrilling(make('Screw the rail into two wall studs.'), rent));

  const owned = enforceDrilling(make('Screw the rail into two wall studs.'), own).recommendations[0]!;
  assert.ok(owned.rationale.includes(DRILL_NOTE) && !owned.rationale.includes(RENTAL_DRILL_NOTE));

  const mat = enforceDrilling(make('It lies flat with no fastening to the wall.'), rent).recommendations[0]!;
  assert.equal(mat.rationale, 'It lies flat with no fastening to the wall.');
});

test('roomRead budget-fit verdicts become a check against the priced total', async () => {
  const { enforceSafety } = await import('@foyer/rubric');
  const c = {
    roomRead: 'The full set should fit the stated budget (Q13). If it runs over the budget, drop the mat first.',
    recommendations: [],
    leaveAlone: [],
    palette: { colors: [], reasoning: '', citations: [] },
  } as unknown as Critique;
  const e = enforceSafety(c);
  assert.equal(e.roomRead, 'Compare the priced total against the budget (Q13) before buying. If it runs over the budget, drop the mat first.');
  assert.deepEqual(enforceSafety(e), e);
});

test('taking down a wall shelf is DIY, and a book stack is not plumbing', async () => {
  const { needsPro } = await import('@foyer/rubric');
  const rationale = 'The chair-to-desk-to-shelf stack is a ladder. Lift the floating shelf off the wall. This is DIY removal with no new fastening.';
  assert.ok(!needsPro({ category: 'FUNCTIONAL', title: 'Take Down The Wall Shelf And Mouse Garland', rationale }).pro);
  assert.ok(needsPro({ category: 'FUNCTIONAL', title: 'Take Down The Wall Between Kitchen And Dining', rationale: 'Open the room.' }).pro);
});

test('a handyman offered as the DIY alternative is dropped, not relicensed', async () => {
  const { enforceSafety } = await import('@foyer/rubric');
  const c = {
    roomRead: '',
    recommendations: [
      { category: 'SPATIAL', title: 'Strap The Cabinet', rationale: 'Strap it to a stud. This is DIY work, or handyman strapping into a found stud. It does not need a trade.', citation: 'Q03', effort: 'LOW', needsProReview: false },
    ],
    leaveAlone: [],
    palette: { colors: [], reasoning: '', citations: [] },
  } as unknown as Critique;
  const r = enforceSafety(c).recommendations[0]!;
  assert.equal(r.rationale, 'Strap it to a stud. This is DIY work. It does not need a trade.');
});
