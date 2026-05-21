# MPCQ quality audit - Stella Biologi question candidates

Generated: 2026-05-18

Status: reject current batch for MPCQ quality.

This audit reads the local MPCQ/Singapore/Stella canon and the current offline
candidate batch in `questions/intake-candidates.jsonl`. It does not inspect private OCR
text, does not write runtime data and does not promote any question.

## Result

| Metric | Count |
|---|---:|
| Candidates audited | 396 |
| Hard-failed candidates | 377 |
| Likely MPCQ pass candidates | 19 |
| Score 0-4 | 0 |
| Score 5-9 | 0 |
| Score 10-14 | 334 |
| Score 15-20 | 62 |

The current candidate batch still fails the MPCQ gate. The existing structural validator only proves that rows are shaped like offline candidate JSON. It does not prove high-inference MPCQ quality.

## Blocking reasons

| Reason | Count |
|---|---:|
| parallel_but_formulaic_options | 378 |
| pseudo_visual_without_asset | 361 |
| label_only_options | 349 |
| too_short_option | 21 |
| weak_absolute_distractor_words | 5 |

## Canon checklist applied

- Source format must be classified before writing: Format 1 combination, Format
  2 table, Format 3 central visual, or Format 4 pure text.
- The task must have exact book location, source claim, OCR/source verification,
  knowledge-link map, remediation map and shortcut check.
- Normal MCQ needs at least 3 independent knowledge links; Singapore/MPCQ needs
  at least 4; gold questions need at least 5.
- Text may define the task, but must not perform the inference.
- Every wrong option must map to a distinct misconception or failed inference.
- Visuals or tables must be answer-critical when present; decorative visuals do
  not count.
- A question is blocked if it can be solved from one fact, text-only keyword
  matching, answer length, obvious absolute wording or process of elimination.

## Representative failures

### bio-q-k1-sec01-011

- Stem: Hypoteser i släktskapsmodell. H1: A-B delar fosterdrag och tidslager men olika handledsben. H2: A-C delar handledsben och fosterdrag men olika tidslager. H3: B-D delar käkled och tänder men olika fosterdrag. H4: C-D delar ryggkotor och kroppsform men saknar mellanled. Vilken har starkast stöd?
- Correct: Val H2 gäller.
- Score estimate: 11/20
- Reasons: pseudo_visual_without_asset, label_only_options, parallel_but_formulaic_options
- Keyword echo: none

### bio-q-k1-sec01-012

- Stem: Fossilmodell R1-R4. R1: lik käkled, tandnötning och miljö, men svag lagerföljd. R2: lik käkled och ryggkotor samt fossil i mellanlager, men få skallfynd. R3: lik ryggkotor, mellanlager och föda, men annan tandform och käkled. R4: lik skallform, yttre drag, miljö och lager, men få ryggkotor jämförda. Välj tyngst stöd.
- Correct: Val R2 gäller.
- Score estimate: 11/20
- Reasons: pseudo_visual_without_asset, label_only_options, parallel_but_formulaic_options
- Keyword echo: none

### bio-q-k1-sec01-013

- Stem: Modell: P-Q har 4 yttre likheter och gren L. P-R har 2 härledda skelettdrag och gren M. Q-S har 3 yttre likheter och gren N. L/M/N ger inget ensamfacit. T1: P-Q väger tyngst för flest likheter. T2: P-R väger tyngst. T3: Q-S väger tyngst för högst samlat teckental. T4: P-R bör vara samma art. Vilken tolkning är bäst?
- Correct: Val T2 gäller.
- Score estimate: 11/20
- Reasons: pseudo_visual_without_asset, label_only_options, parallel_but_formulaic_options
- Keyword echo: none

### bio-q-k1-sec01-014

- Stem: Modell M: 400 milj. år, fem grenar. Data: 36 fossil, 12 drag, ojämn täckning. U1: fossil/drag/täckning rangordnar sena grenar. U2: fossil/drag/täckning låter ålder avgöra. U3: fossil/drag/täckning jämför gemensamma egenskaper. U4: fossil/drag/täckning gör grenar till rak kedja. Vilken användning är rimligast?
- Correct: Val U3 gäller.
- Score estimate: 11/20
- Reasons: pseudo_visual_without_asset, label_only_options, parallel_but_formulaic_options
- Keyword echo: none

### bio-q-k1-sec01-015

- Stem: A-B nod 7; A-C nod 9; A-D nod 2. X finns hos A,B,C; Y är härlett och finns hos A-B; Z är yttre och finns hos A-C. F1: A-C får starkt stöd av Z och nod 9. F2: A-D får starkt stöd av tidig nod 2. F3: A-B får starkt stöd av Y och nod 7. F4: A-B och A-C får lika stöd. Vilket val passar modellen?
- Correct: Val F3 gäller.
- Score estimate: 11/20
- Reasons: pseudo_visual_without_asset, label_only_options, parallel_but_formulaic_options
- Keyword echo: none

### bio-q-k1-sec01-016

- Stem: I: massa 2->6->9 g, R oförändrad. G: R hos 18,31,54 % år 1,8,16; ungar liknar föräldertyp. P1: I:s massa ger bäst evolutionsstöd. P2: G:s R-fördelning ger bäst stöd. P3: R-byte hos individer ger bäst stöd. P4: I och G ger lika starkt stöd. Välj starkaste slutsatsen.
- Correct: Val P2 gäller.
- Score estimate: 11/20
- Reasons: pseudo_visual_without_asset, label_only_options, parallel_but_formulaic_options
- Keyword echo: none

### bio-q-k1-sec01-018

- Stem: A/B: 3 arter, 90 individer. A: art1 80 %, 4 miljöer, 1 färgvariant. B: jämn artfördelning, 2 miljöer, 2 färgvarianter. R1: lika för samma antal. R2: B starkare: jämnhet+2 varianter vägs mot A:s 4 miljöer. R3: A starkare: 4 miljöer vägs mot B:s jämnhet+2 varianter. R4: B starkare för jämnhet ensam. Välj.
- Correct: Val R2 gäller.
- Score estimate: 11/20
- Reasons: pseudo_visual_without_asset, label_only_options, parallel_but_formulaic_options
- Keyword echo: none

### bio-q-k1-sec01-019

- Stem: Art A/B delar 11 DNA-markörer och gren G4. A kallt: pälsindex 8, öron 2 cm. B varmt: pälsindex 3, öron 7 cm. H1: delade markörer gör dragdata överflödiga. H2: efter delning kan miljöer gynna ärftliga varianter. H3: dragskillnad väger bort släktskap. H4: miljö räcker utan arv. Vilket val passar bäst?
- Correct: Val H2 gäller.
- Score estimate: 11/20
- Reasons: pseudo_visual_without_asset, label_only_options, parallel_but_formulaic_options
- Keyword echo: none

### bio-q-k1-sec01-020

- Stem: Område A/B har 4 arter och 70 individer. A: en färgvariant, en livsmiljö. B: tre färgvarianter, två livsmiljöer. M1: individlängd/ålder räcker. M2: cellstorlek i bild räcker. M3: väderdata räcker. M4: färgvarianter, artantal och livsmiljöer hålls isär. Vilket val stöds bäst?
- Correct: Val M4 gäller.
- Score estimate: 11/20
- Reasons: pseudo_visual_without_asset, label_only_options, parallel_but_formulaic_options
- Keyword echo: none

### bio-q-k1-sec01-021

- Stem: Population K: variant L finns hos 25 %. Till parning når 72 % med L och 38 % utan L. Ungar liknar ofta föräldervariant. R1: behov gör L ärftlig. R2: kroppsstyrka avgör utan variantdata. R3: ärftlig variant med högre parningsöverlevnad kan öka. R4: grupperna får lika många ungar. Vilket val passar bäst?
- Correct: Val R3 gäller.
- Score estimate: 11/20
- Reasons: pseudo_visual_without_asset, label_only_options, parallel_but_formulaic_options
- Keyword echo: none

## Completion gate

This audit is a machine-quality signal only. It is not a completion certificate.
No MPCQ repair batch may be called complete until the fail-closed review gate
also passes:

```powershell
node scripts\validate-mpcq-final-gate.mjs
```

That final gate requires structural validation, this audit, and separate
read-only PASS review for every registered max-3 repair batch in
`reports/validation/mpcq-batch-reviews/review-ledger.json`.
