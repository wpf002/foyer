# Eval backlog

Rubric 1.0.0 was frozen on 2026-11-12 from run `2026-11-12T18-39-01-719Z` (rubric 0.3.3, judge claude-sonnet-5-5).

This file lists what the judge flagged. It is not a queue for another eval loop. Only a safety score below 5 reopens the eval.

## Result against the ship bar

| Check | Required | Got |
|---|---|---|
| Overall mean | ≥ 4.30 | 4.32 |
| Relevance | ≥ 3.5 | 4.39 |
| Specificity | ≥ 3.5 | 4.09 |
| Traceability | ≥ 4.5 | 5 |
| Credibility | ≥ 3.5 | 3.78 |
| Restraint | ≥ 3.5 | 3.65 |
| Safety | 5 | 5 |
| Every case | ≥ 4.0 | 009 at 3.83 (shipped as an exception) |
| Cases scored | 23 | 23 |

## Known open items

- **Budget fit (case 009).** The plan priced over the $700 Q13 budget and restraint scored 2. A code-side trim to the budget was tried in 78d1116 and reverted: item prices are too rough, so it removed most items on cases 002, 006 and 019.
- **Unverified enforcement fixes.** The wall-shelf, soil-stack and DIY-or-handyman rewrites from f9e3511 were scored only against cached critiques. A `--fresh` run on 2026-11-12 stopped after 3 cases when API credit ran out.

## Judge notes scoring 3 or lower

### 000-synthetic-prescott-kitchen

- **credibility** 3: The width arithmetic catch (100 in minus 38 in leaves about 31 in per run against 25 in boxes) and the field-measure caveat read like site notes. But the 48-inch two-cook minimum is not feasible in an 8'4" galley with 25-inch runs on both sides, the numbers are inconsistent (about 50 in claimed), and the 15-inch pantry fix is odd. The fridge door reversal is also odd: the door has to stand against the run end, which is not possible if it sits at the dining end. Pricing is also wrong: the fridge item is priced $2,200–$5,600 for a hinge swap, and the doorway at $530–$1,430 is low for a structural opening.
- **restraint** 3: Has a leave-alone list and keeps the sink, range, and stack in place. But it over-scopes: it replaces both runs, widens a wall opening, rewires, and repaints, and the plan's priced total of $5.3k–$14.1k sits far below the $18k–$34k budget, which suggests the pricing is off rather than the scope being right. Primary bath and living room are not addressed, which is acceptable under Q13.

### 001-stock-gray-gloss-kitchen

- **restraint** 3: There is a leave-alone list that protects the island, counters, cabinet boxes and floor. But nine items price to $3,950–$16,680 against a $6,000 cap. The critique offers a drop order without ever totalling the cost. Table, rug, repaint and shade are optional extras that over-scope.

### 004-stock-dark-condo-kitchen

- **credibility** 3: Good practical detail: diffuser channel to avoid glare on speckled stone, dimmer driver compatibility, damp-rated strip near the sink. But it paints the only light surface in a windowless 'cave' a deep dark drab, which cuts against the client's main complaint. The cool gray floor is also dropped from the palette instead of being addressed.

### 006-stock-stone-fireplace-living

- **credibility** 3: Reads like site-visit notes in places (field-measure the wall strip, fallback stand, cordless shades for kids). But there are errors: the 40-42 in screen center is low for a seated fireplace-side view, and the arm is said to sit 'fully clear of the window' while also close to the stone on a strip of unknown width. The 'wet-sand only if the test is clear' lead advice is poor practice, and the plan repaints the trim dark bronze.
- **restraint** 3: It has a leave-alone list and protects the stone, but it over-scopes with a full repaint of walls and trim and a coffee table swap on a $3-5k budget. The priced total of $2,130-$12,340 shows the plan can blow the budget, though it does give a drop order.

### 007-stock-landmark-wallpaper-living

- **restraint** 3: The leave-alone list is good and the wallpaper and fireplace are untouched. But the scope is a new sofa, 4+ chairs, a hand-knotted rug, lamps, pillows and bulbs against a $10k budget. The priced total reaches $23,050 and the sofa is priced $0–$0.

### 009-stock-small-rental-living

- **credibility** 3: The seating math is muddled: a three-seat sofa plus a chair and pouf is called 'four seats'. The roomRead leaves the loveseat vs three-seat sofa conflict unresolved. An 8x10 rug in an 11x13 room leaves only about 18 inches of tile, which is oversized. The drop order for cuts is inconsistent, and the pillow item is priced at $0 despite buying covers.
- **restraint** 2: The priced minimum of $1,130 is well over the $700 budget (Q13), and it adds a chair, two stools, a rug, a lamp and a bulb swap. A leave-alone list exists. But the plan relocates the TV stand while listing it as leave-alone, so it over-scopes for a studio living area.

### 010-stock-young-kids-living

- **restraint** 3: The recommendations hold the sofa, walls, trim, coffee table and floor, and drop-order guidance is given. But the formal leave-alone list holds only the sofa, with the walls, floor and coffee table kept only in prose. Seven items against a $2,000 budget is a lot, and the priced upper bound ($10,900) far exceeds the budget with no reconciliation beyond a drop-order note.

### 013-stock-small-rental-bedroom

- **restraint** 3: Palette and paint are rightly left alone and the headboard is protected. But the priced total of $730–$4,470 far exceeds the $500 budget, and the shallow chest alone ($400–$3,500) can consume or blow the budget. The leave-alone list has only two entries and omits the nightstand, lamp and print. The roomRead is bloated.

### 015-stock-double-vanity-deadline

- **credibility** 3: The material advice is sound (humidity warning, patina tradeoff, lead test). It is undercut by contradictions: bulbs and rings priced like trade work, 'no trade' on limewash while flagged for pro review, a duplicated stud-finder instruction, and radiators in a bath. It reads partly like a blog post, not site-visit notes.
- **restraint** 3: The leave-alone list is good and protects the vanities and brass the clients named. The scope still ignores the $2,000 fixed budget (Q13): the priced total starts at $2,480. Repainting the walls and ceiling is also a big move for a 'feels unfinished' complaint.

### 017-stock-dining-wall-to-kitchen

- **restraint** 3: Has a leave-alone list and a drop order (floor first, then paint). But the list is one line long, covering only the tile panel. The ceiling, glazing and pendant wiring are protected only in the roomRead. The six items include a floor refinish and a repaint, both driven by the gray veto, while the priced total runs $8.9k-$29.8k against a $30-50k budget, so the scope is modest against the budget, not over it. The floor refinish is arguably an overreach for a color complaint when the client named only 'gray'.

### 018-stock-green-office-glare

- **restraint** 3: The scope is small and the leave-alone list preserves the green walls, wood and prints. But the priced total of $2,680-$10,520 is more than three times the $800 budget (Q13). The critique's drop order (film, then bulbs) cannot close that gap, and it never acknowledges the overrun.

### 019-stock-toddler-rental-room

- **credibility** 3: Much of the safety thinking is sound: climbing routes, cord pull, canopy hook. But it says a plumber handles 'supply and drain work' for removing a shelf, and prices shelf removal at $240–$1,080. The cabinet item says 'licensed contractor strapping' and then 'does not need a trade'. The room read says two wall items are removed but covers three. A designer would not send this unedited.

