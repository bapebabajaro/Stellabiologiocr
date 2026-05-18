#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const write = process.argv.includes('--write');
const subject = 'biologi';
const bookEditionId = 'bookedition-stella-biologi-ocr-v1';
const importBatchId = 'biologi-k1-sec01-offline-batch-20260518';
const bookLocationId = 'bookedition-stella-biologi-ocr-v1:biologi-kap1-sec01';
const sourceClaimId = 'sourceclaim-bookedition-stella-biologi-ocr-v1-biologi-kap1-sec01';
const sourceAtomId = 'source-atom-bookedition-stella-biologi-ocr-v1-biologi-kap1-sec01';
const chapterCode = 'K1';
const delkapitel = 'K1-biologi-kap1-sec01';

function readJsonl(rel) {
  const text = readFileSync(join(root, rel), 'utf8').trim();
  if (!text) return [];
  return text.split(/\r?\n/).map((line) => JSON.parse(line));
}

function hash(value) {
  return `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

function optionRows(correct, wrong, correctIndex) {
  const optionTexts = [...wrong];
  optionTexts.splice(correctIndex, 0, correct);
  return optionTexts.map((text, index) => ({ id: ['A', 'B', 'C', 'D'][index], text }));
}

function falseValidationReport() {
  return {
    runtimeDataChanged: false,
    runtimeWriteAllowed: false,
    runtimePromotionAllowed: false,
    candidateGenerationAllowed: false,
    canImportAsActive: false,
    canImportAsDraft: false,
    activationAllowed: false,
    runtimeActivationAllowed: false,
    runtimeImportAllowed: false,
    importApplyAllowed: false,
    kvWriteAllowed: false,
    safeActiveWriteAllowed: false,
    pixelBindingAllowed: false,
    pixelWriteAllowed: false,
    productionDeployAllowed: false,
    requiredBeforeActive: [
      'human biology content review',
      'QKL review',
      'public sanitized copy review',
      'safe-active release order'
    ]
  };
}

function metadataCompleteness() {
  return {
    checks: {
      bookLocationIds: true,
      sourceClaimIds: true,
      knowledgePointIds: true,
      studentStem: true,
      options: true,
      correctOptionId: true,
      distractorRationales: true,
      solution: true,
      publicSanitizedSourceSummary: true,
      questionKnowledgeLinks: true,
      runtimeProjection: true,
      qklReviewRequired: true
    }
  };
}

const authored = [
  {
    kp: '001',
    typ: 'begrepp',
    niva: 1,
    stem: 'Vad menas med biologisk utveckling när man jämför organismer över lång tid?',
    correct: 'Ärftliga egenskaper i populationer förändras mellan generationer',
    wrong: ['En individ byter art under sitt liv', 'Alla arter blir alltid mer avancerade', 'Organismer tränar fram egenskaper som direkt ärvs'],
    rationales: ['Blandar ihop individens liv med förändringar i populationer.', 'Evolution har ingen bestämd riktning mot mer avancerat.', 'Förvärvade tränade egenskaper är inte samma sak som ärftlig förändring.'],
    solution: 'Biologisk utveckling beskriver hur ärftliga egenskaper blir vanligare eller ovanligare i populationer över generationer.',
    summary: 'Sanitiserad grundning: delområdet behandlar utveckling och mångfald som förändring i populationer över tid.',
    tags: ['begrepp', 'evolution']
  },
  {
    kp: '001',
    typ: 'begrepp',
    niva: 1,
    stem: 'Vilket exempel passar bäst till begreppet population?',
    correct: 'Alla abborrar av samma art i en viss sjö',
    wrong: ['Alla djur som lever i Sverige', 'En enda abborre i ett akvarium', 'Alla fiskar, växter och bakterier i en sjö'],
    rationales: ['Det omfattar många arter och är därför inte en population.', 'En individ räcker inte för att vara en population.', 'Det beskriver mer ett ekosystem än en population av en art.'],
    solution: 'En population är individer av samma art inom ett avgränsat område, till exempel abborrar i samma sjö.',
    summary: 'Sanitiserad grundning: delområdet kopplar livets utveckling till grupper av organismer och biologisk variation.',
    tags: ['begrepp', 'population']
  },
  {
    kp: '001',
    typ: 'begrepp',
    niva: 2,
    stem: 'Varför är ärftlig variation viktig för evolution?',
    correct: 'Den gör att individer kan ha olika egenskaper som påverkar överlevnad och fortplantning',
    wrong: ['Den gör att alla individer blir exakt lika', 'Den stoppar naturligt urval från att påverka arter', 'Den betyder att miljön aldrig spelar någon roll'],
    rationales: ['Evolution behöver skillnader, inte total likhet.', 'Naturligt urval verkar på variation i ärftliga egenskaper.', 'Miljö och ärftlig variation samspelar i evolution.'],
    solution: 'När individer skiljer sig åt ärftligt kan vissa egenskaper ge fördelar i en viss miljö och därför spridas.',
    summary: 'Sanitiserad grundning: delområdet behandlar hur utveckling hänger samman med variation i levande organismer.',
    tags: ['variation', 'evolution']
  },
  {
    kp: '001',
    typ: 'mcq',
    niva: 2,
    stem: 'En egenskap blir vanligare i en population under många generationer. Vilken förklaring är mest biologiskt rimlig?',
    correct: 'Egenskapen är ärftlig och individer med den får oftare avkomma',
    wrong: ['Alla individer bestämmer sig för att använda egenskapen', 'Egenskapen uppstår för att arten behöver den', 'Egenskapen sprids utan koppling till fortplantning'],
    rationales: ['Vilja hos individer förklarar inte ärftlig förändring i populationer.', 'Behov skapar inte automatiskt en ärftlig egenskap.', 'Förändrad frekvens i evolution handlar om arv och reproduktion.'],
    solution: 'En ärftlig egenskap sprids evolutionärt om bärare i genomsnitt bidrar mer till kommande generationer.',
    summary: 'Sanitiserad grundning: delområdet rör hur egenskaper kan förändras i populationer över tid.',
    tags: ['urval', 'ärftlighet']
  },
  {
    kp: '001',
    typ: 'resonemang',
    niva: 3,
    stem: 'Varför kan man säga att evolution främst sker i populationer och inte i enskilda individer?',
    correct: 'Det är frekvensen av ärftliga egenskaper i gruppen som förändras mellan generationer',
    wrong: ['En individ kan alltid ändra sina gener när miljön ändras', 'En individ måste byta art innan evolution kan räknas', 'Evolution handlar bara om att en individ växer och blir större'],
    rationales: ['Gener ändras inte viljestyrt hos individen för att miljön ändras.', 'Artbyte hos individer är inte hur evolution fungerar.', 'Tillväxt under livet är inte samma sak som evolutionär förändring.'],
    solution: 'Individer föds med sina ärftliga anlag, medan populationens sammansättning kan ändras när generationer avlöser varandra.',
    summary: 'Sanitiserad grundning: delområdet skiljer mellan individers liv och utveckling i grupper över tid.',
    tags: ['resonemang', 'population']
  },
  {
    kp: '002',
    typ: 'samband',
    niva: 1,
    stem: 'Vilket samband beskriver bäst hur mångfald och utveckling hänger ihop?',
    correct: 'Evolution kan ge upphov till nya skillnader mellan populationer och arter',
    wrong: ['Mångfald gör evolution omöjlig', 'Evolution tar alltid bort alla skillnader', 'Mångfald finns bara hos växter'],
    rationales: ['Mångfald är snarare ett resultat och en förutsättning i evolutionära processer.', 'Evolution kan både minska och öka skillnader beroende på situation.', 'Biologisk mångfald finns hos många typer av organismer.'],
    solution: 'När populationer förändras och skiljs åt över tid kan den biologiska mångfalden öka.',
    summary: 'Sanitiserad grundning: delområdet kopplar livets utveckling till biologisk mångfald.',
    tags: ['samband', 'mångfald']
  },
  {
    kp: '002',
    typ: 'samband',
    niva: 2,
    stem: 'Två populationer av samma art isoleras på olika öar. Vad kan hända efter mycket lång tid?',
    correct: 'De kan utveckla olika egenskaper och till slut bli skilda arter',
    wrong: ['De måste genast bli exakt likadana', 'De slutar påverkas av arv', 'De kan inte längre få några mutationer'],
    rationales: ['Olika miljöer och isolering kan i stället öka skillnader.', 'Arv är fortfarande centralt i populationernas utveckling.', 'Mutationer kan uppstå även i isolerade populationer.'],
    solution: 'Isolering kan göra att populationer samlar olika ärftliga förändringar och med tiden blir svåra att korsa.',
    summary: 'Sanitiserad grundning: delområdet behandlar utveckling och mångfald i populationer över tid.',
    tags: ['artbildning', 'population']
  },
  {
    kp: '002',
    typ: 'förståelse',
    niva: 2,
    stem: 'Varför kan en miljöförändring påverka vilka egenskaper som blir vanliga i en population?',
    correct: 'Miljön kan ändra vilka egenskaper som ger bäst chans att överleva och få avkomma',
    wrong: ['Miljön väljer alltid de största individerna', 'Miljön gör alla mutationer nyttiga', 'Miljön tar bort ärftlighet från populationen'],
    rationales: ['Storlek är bara en möjlig egenskap och inte alltid en fördel.', 'Mutationer kan vara negativa, neutrala eller positiva beroende på sammanhang.', 'Ärftlighet finns kvar även när miljön förändras.'],
    solution: 'När miljön ändras kan andra ärftliga egenskaper än tidigare bli fördelaktiga och därför spridas.',
    summary: 'Sanitiserad grundning: delområdet rör sambandet mellan miljö, utveckling och variation.',
    tags: ['miljö', 'urval']
  },
  {
    kp: '002',
    typ: 'mcq',
    niva: 2,
    stem: 'Vilken situation kan öka biologisk mångfald över lång tid?',
    correct: 'Populationer lever åtskilda och anpassas till olika miljöer',
    wrong: ['Alla miljöer blir exakt likadana', 'All ärftlig variation försvinner', 'Inga organismer får avkomma'],
    rationales: ['Likartade miljöer ger inte samma drivkraft för skilda anpassningar.', 'Utan variation finns mindre material för evolutionär förändring.', 'Utan avkomma kan ingen evolutionär förändring spridas.'],
    solution: 'Åtskilda populationer i olika miljöer kan utvecklas åt olika håll och bidra till större mångfald.',
    summary: 'Sanitiserad grundning: delområdet behandlar mångfald som kopplad till utveckling och anpassning.',
    tags: ['mångfald', 'anpassning']
  },
  {
    kp: '002',
    typ: 'resonemang',
    niva: 3,
    stem: 'En ö har flera närbesläktade fågelarter med olika näbbar. Vilken slutsats är rimligast?',
    correct: 'Olika föda och miljöer kan ha gynnat olika näbbformer över tid',
    wrong: ['Alla fåglarna måste ha lärt sig näbbformen under livet', 'Näbbformen saknar koppling till överlevnad', 'Arterna kan inte vara släkt om de ser olika ut'],
    rationales: ['Inlärning under livet ändrar inte ärftlig näbbform hos avkomman.', 'Näbbform kan påverka vilken föda fågeln klarar av.', 'Närbesläktade arter kan ha utvecklats åt olika håll.'],
    solution: 'Skillnader i föda och miljö kan göra att olika ärftliga näbbformer gynnas i olika populationer.',
    summary: 'Sanitiserad grundning: delområdet kopplar biologisk mångfald till evolutionära samband.',
    tags: ['resonemang', 'anpassning']
  },
  {
    kp: '003',
    typ: 'modell',
    niva: 1,
    stem: 'I ett släktträd för arter möts två grenar längre ner i trädet. Vad visar det oftast?',
    correct: 'Arterna har en gemensam förfader längre tillbaka i tiden',
    wrong: ['Arterna är samma individ', 'Arterna lever alltid i samma miljö', 'Arterna kan inte förändras mer'],
    rationales: ['Ett släktträd visar relationer mellan grupper, inte en enda individ.', 'Släktskap betyder inte automatiskt samma miljö.', 'Arter kan fortsätta förändras även efter att grenar skilts åt.'],
    solution: 'När grenar möts i ett släktträd brukar det visa en äldre gemensam förfader.',
    summary: 'Sanitiserad grundning: delområdet använder utveckling och mångfald för att tolka samband mellan arter.',
    tags: ['modell', 'släktskap']
  },
  {
    kp: '003',
    typ: 'modell',
    niva: 2,
    stem: 'Vad är viktigast att titta på när man tolkar en enkel modell över evolutionärt släktskap?',
    correct: 'Var grenar delar sig och vilka grupper som delar närmaste förfader',
    wrong: ['Vilken art som står längst till höger', 'Vilken art som är störst i verkligheten', 'Vilken art som eleven tycker är mest utvecklad'],
    rationales: ['Placering åt höger eller vänster är ofta bara layout i modellen.', 'Storlek i verkligheten visar inte automatiskt närmast släktskap.', 'Släktskap bedöms inte utifrån värderingar om mest utvecklad.'],
    solution: 'I släktskapsmodeller är förgreningarna centrala eftersom de visar gemensamma förfäder och när grupper skildes åt.',
    summary: 'Sanitiserad grundning: delområdet tränar tolkning av modeller för utveckling och mångfald.',
    tags: ['modell', 'tolkning']
  },
  {
    kp: '003',
    typ: 'modell',
    niva: 2,
    stem: 'En modell visar att två arter har många gemensamma drag. Vilken förklaring passar bäst?',
    correct: 'De kan ha ärvt dragen från en gemensam förfader',
    wrong: ['De måste vara exakt samma art', 'De har alltid levt på samma plats', 'De har slutat påverkas av evolution'],
    rationales: ['Olika arter kan dela drag utan att vara samma art.', 'Gemensamma drag kräver inte alltid samma livsmiljö.', 'Arter med gemensamma drag kan fortfarande förändras över tid.'],
    solution: 'Gemensamma drag kan vara spår av släktskap och arv från en äldre gemensam förfader.',
    summary: 'Sanitiserad grundning: delområdet kopplar modeller till utveckling och biologiska samband.',
    tags: ['modell', 'gemensam förfader']
  },
  {
    kp: '003',
    typ: 'förståelse',
    niva: 3,
    stem: 'Varför är en modell över evolution alltid en förenkling?',
    correct: 'Den visar några viktiga samband men tar inte med alla detaljer i livets historia',
    wrong: ['Den behöver därför inte bygga på fakta', 'Den visar alltid exakt varje individ som funnits', 'Den kan bara användas för nu levande arter'],
    rationales: ['En vetenskaplig modell ska fortfarande bygga på belägg.', 'Evolutionära modeller visar grupper och samband, inte varje individ.', 'Modeller kan också användas för utdöda arter om det finns belägg.'],
    solution: 'Modeller hjälper oss se mönster, men de väljer bort många detaljer för att göra sambanden begripliga.',
    summary: 'Sanitiserad grundning: delområdet kräver tolkning av modeller utan att överläsa dem.',
    tags: ['modellkritik', 'resonemang']
  },
  {
    kp: '003',
    typ: 'mcq',
    niva: 2,
    stem: 'Vilken fråga kan en evolutionär modell ofta hjälpa till att besvara?',
    correct: 'Vilka organismer som är närmare släkt med varandra',
    wrong: ['Vilken individ som är starkast i en flock', 'Exakt hur gammal varje cell i kroppen är', 'Vilken art som är mest värdefull'],
    rationales: ['Styrka hos en individ är inte modellens huvudsyfte.', 'Cellålder är inte samma sak som evolutionärt släktskap.', 'Vetenskapliga modeller rangordnar inte arters värde.'],
    solution: 'Evolutionära modeller används ofta för att visa släktskap och gemensamt ursprung.',
    summary: 'Sanitiserad grundning: delområdet behandlar modeller som stöd för utveckling och mångfald.',
    tags: ['modell', 'släktskap']
  },
  {
    kp: '004',
    typ: 'jämförelse',
    niva: 1,
    stem: 'Vilken skillnad mellan individ och population är viktigast i evolution?',
    correct: 'Individer lever och dör, men populationers egenskaper kan förändras över generationer',
    wrong: ['Populationer består aldrig av individer', 'Individer har alltid fler arter än populationer', 'Populationer kan inte påverkas av miljön'],
    rationales: ['Populationer består just av individer av samma art i ett område.', 'En individ tillhör en art; den innehåller inte flera arter.', 'Miljö kan påverka vilka individer som får mest avkomma.'],
    solution: 'Evolution syns som förändringar i populationer över tid, även om urvalet påverkar individer.',
    summary: 'Sanitiserad grundning: delområdet skiljer nivåer i livets utveckling och mångfald.',
    tags: ['jämförelse', 'population']
  },
  {
    kp: '004',
    typ: 'jämförelse',
    niva: 2,
    stem: 'Vad skiljer en ärftlig egenskap från en egenskap som tränats upp under livet?',
    correct: 'En ärftlig egenskap kan föras vidare via gener till avkomma',
    wrong: ['En tränad egenskap finns alltid i DNA från början', 'En ärftlig egenskap kan aldrig påverka kroppen', 'Båda förs vidare på exakt samma sätt'],
    rationales: ['Träning kan ändra förmåga men inte automatiskt göra förändringen ärftlig.', 'Ärftliga egenskaper kan påverka kropp och funktion.', 'Ärftliga och förvärvade egenskaper har olika relation till avkomma.'],
    solution: 'Evolution bygger på ärftlig variation, eftersom sådana egenskaper kan påverka kommande generationer.',
    summary: 'Sanitiserad grundning: delområdet kopplar utveckling till ärftliga egenskaper.',
    tags: ['jämförelse', 'ärftlighet']
  },
  {
    kp: '004',
    typ: 'jämförelse',
    niva: 2,
    stem: 'Vilket påstående jämför art och biologisk mångfald på rätt sätt?',
    correct: 'En art är en grupp organismer, medan biologisk mångfald handlar om variation på flera nivåer',
    wrong: ['Biologisk mångfald betyder bara en enda art', 'En art är alltid ett helt ekosystem', 'Mångfald kan bara mätas genom antal individer av samma art'],
    rationales: ['Mångfald handlar om variation, inte bara en art.', 'Ett ekosystem innehåller ofta många arter och miljöfaktorer.', 'Antal individer säger inte hela bilden av biologisk variation.'],
    solution: 'Biologisk mångfald kan handla om arter, gener och ekosystem, medan art är en mer avgränsad grupp.',
    summary: 'Sanitiserad grundning: delområdet kopplar livets utveckling till nivåer av mångfald.',
    tags: ['art', 'mångfald']
  },
  {
    kp: '004',
    typ: 'förståelse',
    niva: 3,
    stem: 'Varför kan två närbesläktade arter ändå ha tydligt olika egenskaper?',
    correct: 'De kan ha utvecklats i olika miljöer efter att deras utvecklingslinjer skilts åt',
    wrong: ['Närbesläktade arter måste alltid vara identiska', 'Olika egenskaper bevisar att de inte kan vara släkt', 'Släktskap gör att miljön slutar spela roll'],
    rationales: ['Släktskap betyder gemensamt ursprung, inte total likhet.', 'Skillnader kan uppstå efter att släktlinjer skilts åt.', 'Miljö kan fortsätta påverka urval även hos närbesläktade grupper.'],
    solution: 'När grupper skiljs åt kan olika miljöer och variation göra att olika egenskaper gynnas över tid.',
    summary: 'Sanitiserad grundning: delområdet kräver jämförelse mellan släktskap, miljö och egenskaper.',
    tags: ['jämförelse', 'släktskap']
  },
  {
    kp: '004',
    typ: 'mcq',
    niva: 2,
    stem: 'Vilket par beskriver två olika nivåer av biologisk mångfald?',
    correct: 'Variation mellan gener och variation mellan arter',
    wrong: ['En individs längd och samma individs ålder', 'En cells storlek och en cells färg i en bild', 'En dagstemperatur och en vindriktning'],
    rationales: ['Det handlar om en individ, inte tydligt om biologisk mångfald på flera nivåer.', 'Cellbeskrivningar i en bild räcker inte som nivåer av mångfald.', 'Väderfaktorer är inte biologiska nivåer av mångfald.'],
    solution: 'Mångfald kan beskrivas på flera biologiska nivåer, till exempel genetisk variation och artvariation.',
    summary: 'Sanitiserad grundning: delområdet behandlar mångfald på olika biologiska nivåer.',
    tags: ['mångfald', 'nivåer']
  },
  {
    kp: '005',
    typ: 'resonemang',
    niva: 1,
    stem: 'Vilket påstående om naturligt urval är mest rimligt?',
    correct: 'Individer med gynnsamma ärftliga egenskaper kan få fler överlevande avkommor',
    wrong: ['Naturen väljer alltid den starkaste individen i varje situation', 'Alla individer får alltid lika många avkommor', 'Egenskaper blir ärftliga bara för att de behövs'],
    rationales: ['Styrka är inte alltid den egenskap som ger bäst reproduktion.', 'Skillnader i överlevnad och fortplantning är centrala i urval.', 'Behov gör inte automatiskt en egenskap ärftlig.'],
    solution: 'Naturligt urval handlar om skillnader i överlevnad och fortplantning kopplade till ärftliga egenskaper.',
    summary: 'Sanitiserad grundning: delområdet använder utveckling för att resonera om ärftliga egenskaper.',
    tags: ['naturligt urval', 'resonemang']
  },
  {
    kp: '005',
    typ: 'resonemang',
    niva: 2,
    stem: 'En insektspopulation får fler mörka individer i en mörk miljö. Vilken förklaring är bäst?',
    correct: 'Mörk färg kan ha gjort individer svårare att upptäcka och därför vanligare över generationer',
    wrong: ['Varje insekt valde att färga om sig permanent', 'Mörk miljö gör alla avkommor mörka utan arv', 'Ljusa individer slutar vara samma art direkt'],
    rationales: ['Individer färgar inte om ärftliga egenskaper genom beslut.', 'Förändringen behöver kopplas till ärftlighet för evolutionär förklaring.', 'Färgskillnader betyder inte automatiskt omedelbar artbildning.'],
    solution: 'Om mörk färg är ärftlig och ger bättre kamouflage kan den bli vanligare i populationen.',
    summary: 'Sanitiserad grundning: delområdet stödjer resonemang om variation, miljö och utveckling.',
    tags: ['kamouflage', 'urval']
  },
  {
    kp: '005',
    typ: 'resonemang',
    niva: 2,
    stem: 'Varför räcker det inte att en egenskap är nyttig för att den säkert ska spridas evolutionärt?',
    correct: 'Egenskapen måste också kunna ärvas och påverka chansen till avkomma',
    wrong: ['Nyttiga egenskaper kan aldrig spridas', 'Alla nyttiga egenskaper uppstår samtidigt hos alla', 'Evolution sker utan koppling till avkomma'],
    rationales: ['Nyttiga ärftliga egenskaper kan spridas, men det är inte garanterat.', 'Egenskaper uppstår inte automatiskt hos alla individer samtidigt.', 'Avkomma är central när egenskaper blir vanligare över generationer.'],
    solution: 'För evolutionär spridning krävs att egenskapen är ärftlig och påverkar reproduktiv framgång i sammanhanget.',
    summary: 'Sanitiserad grundning: delområdet tränar resonemang om vad som krävs för utveckling över tid.',
    tags: ['resonemang', 'ärftlighet']
  },
  {
    kp: '005',
    typ: 'förståelse',
    niva: 3,
    stem: 'En elev säger att giraffer fick långa halsar eftersom de sträckte sig efter löv. Vad behöver förbättras i förklaringen?',
    correct: 'Förklaringen behöver handla om ärftlig variation och vilka individer som fick mest avkomma',
    wrong: ['Förklaringen behöver säga att alla giraffer var identiska', 'Förklaringen behöver ta bort miljön helt', 'Förklaringen behöver säga att halsar inte kan ärvas'],
    rationales: ['Evolution kräver variation, inte identiska individer.', 'Miljön är viktig eftersom den påverkar vilka egenskaper som gynnas.', 'Ärftlighet är central för att egenskaper ska spridas.'],
    solution: 'En bättre förklaring är att ärftlig variation i halslängd kan ha påverkat födotillgång, överlevnad och avkomma.',
    summary: 'Sanitiserad grundning: delområdet skiljer vardagsförklaringar från evolutionära resonemang.',
    tags: ['missuppfattning', 'urval']
  },
  {
    kp: '005',
    typ: 'mcq',
    niva: 2,
    stem: 'Vilken formulering undviker bäst en vanlig missuppfattning om evolution?',
    correct: 'Populationer förändras när ärftliga egenskaper blir olika vanliga över generationer',
    wrong: ['Individer utvecklas alltid till en bättre art under livet', 'Arter får de egenskaper de önskar sig', 'Evolution gör alla organismer mer komplicerade'],
    rationales: ['Individer byter inte art under sin livstid genom evolution.', 'Önskan skapar inte ärftliga egenskaper.', 'Evolution har ingen automatisk riktning mot mer komplexitet.'],
    solution: 'Evolution beskriver förändring i populationers ärftliga egenskaper, inte önskningar eller automatisk förbättring.',
    summary: 'Sanitiserad grundning: delområdet kräver korrekt resonemang om utveckling över tid.',
    tags: ['missuppfattning', 'evolution']
  },
  {
    kp: '006',
    typ: 'process',
    niva: 1,
    stem: 'Vilken ordning beskriver en enkel evolutionär process bäst?',
    correct: 'Variation finns, miljön påverkar överlevnad, egenskaper kan bli vanligare',
    wrong: ['Behov uppstår, alla individer ändrar gener, arten blir färdig', 'Alla individer är lika, ingen får avkomma, mångfald ökar', 'Miljön försvinner, arv upphör, egenskaper sprids'],
    rationales: ['Behov ändrar inte automatiskt gener hos alla individer.', 'Utan variation och avkomma finns ingen sådan process.', 'Arv och miljö är båda viktiga i evolutionära processer.'],
    solution: 'Evolution kan beskrivas som variation, urval i en miljö och förändrad frekvens av ärftliga egenskaper.',
    summary: 'Sanitiserad grundning: delområdet kopplar orsak och följd i livets utveckling.',
    tags: ['process', 'urval']
  },
  {
    kp: '006',
    typ: 'process',
    niva: 2,
    stem: 'Vad är en möjlig följd av att en population får mycket liten genetisk variation?',
    correct: 'Den kan få svårare att anpassas om miljön förändras snabbt',
    wrong: ['Den blir automatiskt odödlig', 'Den får alltid fler arter direkt', 'Den påverkas inte längre av sjukdomar'],
    rationales: ['Liten variation gör inte individer odödliga.', 'Artbildning är inte en automatisk direkt följd av liten variation.', 'Sjukdomar kan vara extra problematiska om variationen är låg.'],
    solution: 'Genetisk variation ger fler möjliga egenskaper som kan vara användbara när miljön förändras.',
    summary: 'Sanitiserad grundning: delområdet rör följder av variation och mångfald.',
    tags: ['genetisk variation', 'anpassning']
  },
  {
    kp: '006',
    typ: 'samband',
    niva: 2,
    stem: 'Hur kan mutationer kopplas till evolution?',
    correct: 'De kan skapa ny ärftlig variation som naturligt urval eller slump kan påverka',
    wrong: ['De gör alltid organismen starkare', 'De händer bara när arten behöver dem', 'De kan aldrig föras vidare'],
    rationales: ['Mutationer kan vara skadliga, neutrala eller gynnsamma.', 'Mutationer uppstår inte för att arten behöver dem.', 'Mutationer i könsceller kan föras vidare till avkomma.'],
    solution: 'Mutationer är en källa till ärftlig variation, men deras betydelse beror på arv, miljö och reproduktion.',
    summary: 'Sanitiserad grundning: delområdet kopplar orsak och följd i utveckling över tid.',
    tags: ['mutation', 'variation']
  },
  {
    kp: '006',
    typ: 'förståelse',
    niva: 3,
    stem: 'Varför kan samma egenskap vara fördelaktig i en miljö men nackdel i en annan?',
    correct: 'Miljön avgör vilka egenskaper som hjälper eller hindrar överlevnad och fortplantning',
    wrong: ['Egenskaper har alltid samma värde i alla miljöer', 'Arv slutar spela roll när miljön ändras', 'Alla egenskaper är alltid neutrala'],
    rationales: ['En egenskaps betydelse beror ofta på sammanhang.', 'Ärftlighet är fortfarande viktig när miljön ändras.', 'Många egenskaper kan påverka överlevnad eller fortplantning.'],
    solution: 'En egenskap måste bedömas i sitt sammanhang; samma drag kan ge olika följder i olika miljöer.',
    summary: 'Sanitiserad grundning: delområdet behandlar samband mellan miljö, egenskaper och utveckling.',
    tags: ['miljö', 'anpassning']
  },
  {
    kp: '006',
    typ: 'resonemang',
    niva: 3,
    stem: 'Ett rovdjur jagar främst långsamma byten. Vad kan hända med bytespopulationen över många generationer?',
    correct: 'Ärftliga egenskaper som bidrar till snabb flykt kan bli vanligare',
    wrong: ['Alla byten blir snabbare direkt under samma dag', 'Rovdjuret gör att arv inte längre spelar roll', 'Populationen måste utvecklas till en helt ny art direkt'],
    rationales: ['Evolutionär förändring sker över generationer, inte direkt hos alla individer.', 'Urvalet verkar just på ärftliga skillnader.', 'Artbildning kan ta lång tid och är inte en omedelbar följd.'],
    solution: 'Om snabbare flykt är ärftlig och ökar chansen att överleva och få avkomma kan egenskapen spridas.',
    summary: 'Sanitiserad grundning: delområdet tränar orsak-följd-resonemang om utveckling och mångfald.',
    tags: ['predation', 'urval']
  },
  {
    kp: '007',
    typ: 'begrepp',
    niva: 1,
    stem: 'Vilket exempel visar ett biologiskt samband mellan utveckling och mångfald?',
    correct: 'Olika miljöer gynnar olika ärftliga egenskaper i åtskilda populationer',
    wrong: ['Alla arter är oföränderliga', 'En individ väljer själv vilken art den blir', 'Mångfald betyder att alla organismer är likadana'],
    rationales: ['Om arter vore helt oföränderliga skulle evolution inte förklara mångfald.', 'Individer väljer inte art genom evolution.', 'Mångfald handlar om variation, inte likhet.'],
    solution: 'Ett biologiskt samband är att olika miljöer kan bidra till att populationer utvecklas åt olika håll.',
    summary: 'Sanitiserad grundning: delområdet behandlar exempel på samband mellan utveckling och mångfald.',
    tags: ['samband', 'mångfald']
  },
  {
    kp: '007',
    typ: 'begrepp',
    niva: 2,
    stem: 'Vilket exempel passar bäst till biologisk mångfald inom en art?',
    correct: 'Olika ärftliga varianter av färg eller storlek inom samma population',
    wrong: ['Skillnaden mellan sten och vatten', 'Att en individ blir äldre under året', 'Att alla individer har exakt samma gener'],
    rationales: ['Sten och vatten är inte biologisk variation inom en art.', 'Åldrande hos en individ är inte mångfald inom arten.', 'Exakt samma gener skulle innebära mycket låg genetisk variation.'],
    solution: 'Mångfald inom en art kan handla om genetisk variation mellan individer i samma population.',
    summary: 'Sanitiserad grundning: delområdet kopplar biologiska samband till variation inom levande grupper.',
    tags: ['genetisk variation', 'mångfald']
  },
  {
    kp: '007',
    typ: 'förståelse',
    niva: 2,
    stem: 'Varför är fossil ett exempel på belägg för livets utveckling?',
    correct: 'De kan visa organismer som levde tidigare och hur livsformer har förändrats över tid',
    wrong: ['De visar alltid exakt samma arter som lever idag', 'De bevisar att inga arter har dött ut', 'De saknar koppling till tidsordning'],
    rationales: ['Fossil visar ofta utdöda former eller äldre släktingar.', 'Fossil är viktiga just för att många livsformer har försvunnit.', 'Fossil tolkas tillsammans med lager och tidsbestämning.'],
    solution: 'Fossil kan ge spår av tidigare liv och hjälpa oss jämföra organismer från olika tider.',
    summary: 'Sanitiserad grundning: delområdet använder exempel för att förstå utveckling över lång tid.',
    tags: ['fossil', 'belägg']
  }
];

const authoredSec02 = [
  {
    kp: '001',
    typ: 'begrepp',
    niva: 1,
    stem: 'Vad är huvudsyftet med att använda ett mikroskop i biologi?',
    correct: 'Att kunna undersöka detaljer som är för små för att se tydligt med ögat',
    wrong: ['Att väga små organismer exakt', 'Att mäta temperaturen i ett prov', 'Att ändra vilka celler som finns i provet'],
    rationales: ['Vikt mäts med våg, inte med mikroskopets optik.', 'Temperatur kräver termometer eller sensor, inte mikroskop.', 'Mikroskopet visar provet men ska inte förändra vilka celler som finns.'],
    solution: 'Ett mikroskop förstorar och synliggör små strukturer, till exempel celler eller detaljer i ett preparat.',
    summary: 'Sanitiserad grundning: delområdet behandlar mikroskopering som metod för observation.',
    tags: ['mikroskop', 'begrepp']
  },
  {
    kp: '001',
    typ: 'begrepp',
    niva: 1,
    stem: 'Vilket begrepp beskriver materialet som placeras på objektglaset för att undersökas?',
    correct: 'Preparat',
    wrong: ['En hypotes', 'Felkällor', 'Population'],
    rationales: ['En hypotes är en tänkbar förklaring, inte själva materialet på glaset.', 'Felkällor är sådant som kan störa resultatet.', 'Population betyder individer av samma art i ett område.'],
    solution: 'Preparatet är det material eller prov som läggs på objektglaset och studeras i mikroskopet.',
    summary: 'Sanitiserad grundning: delområdet använder mikroskoperingens metodord och observationer.',
    tags: ['preparat', 'metod']
  },
  {
    kp: '005',
    typ: 'begrepp',
    niva: 2,
    stem: 'Varför börjar man ofta med låg förstoring när man mikroskoperar?',
    correct: 'Det blir lättare att hitta provet och orientera sig i bilden',
    wrong: ['Högsta förstoring gör det lättast att hitta hela preparatet', 'Låg förstoring är främst till för att mäta provets temperatur', 'Skärpan bör ställas in först efter att man bytt till högsta förstoring'],
    rationales: ['Högsta förstoring visar ett mindre område och kan göra provet svårare att hitta.', 'Temperatur mäts inte med mikroskopets förstoring.', 'Skärpa och orientering behövs redan innan man går vidare till högre förstoring.'],
    solution: 'Låg förstoring ger större synfält och gör det lättare att hitta rätt område innan man förstorar mer.',
    summary: 'Sanitiserad grundning: delområdet tränar praktiskt val av förstoring vid observation.',
    tags: ['förstoring', 'mikroskop']
  },
  {
    kp: '005',
    typ: 'mcq',
    niva: 2,
    stem: 'Vad händer oftast med synfältet när förstoringen ökar?',
    correct: 'Man ser ett mindre område men mer detalj',
    wrong: ['Man ser ett större område och mindre detalj', 'Bilden slutar påverkas av fokus', 'Provet blir automatiskt tunnare'],
    rationales: ['Större förstoring brukar minska området man ser.', 'Fokus är fortfarande viktigt vid högre förstoring.', 'Förstoring ändrar inte preparatets tjocklek.'],
    solution: 'När förstoringen ökar syns ett mindre område av provet, men detaljer kan bli tydligare.',
    summary: 'Sanitiserad grundning: delområdet kopplar mikroskopering till förstoring och observation.',
    tags: ['förstoring', 'synfält']
  },
  {
    kp: '001',
    typ: 'metod',
    niva: 2,
    stem: 'Vilken del av arbetet med mikroskopet hör tydligast ihop med begreppet fokus?',
    correct: 'Att ställa in skärpan så att strukturerna blir tydliga',
    wrong: ['Att välja vilken fråga undersökningen ska besvara', 'Att bestämma provets art utan observation', 'Att skriva en hypotes efter resultatet'],
    rationales: ['Frågeställning är viktig men är inte fokusinställning.', 'Artbestämning kräver observation och belägg.', 'Hypotes och resultat är delar av undersökning, inte skärpeinställning.'],
    solution: 'Fokus handlar om bildens skärpa; rätt fokus gör att strukturer i preparatet kan observeras tydligare.',
    summary: 'Sanitiserad grundning: delområdet behandlar metodsteg för tydlig mikroskopobservation.',
    tags: ['fokus', 'metod']
  },
  {
    kp: '002',
    typ: 'samband',
    niva: 1,
    stem: 'Vilket samband finns mellan ljus och observation i ett ljusmikroskop?',
    correct: 'Rätt mängd ljus gör det lättare att se strukturer i preparatet',
    wrong: ['Svagare kontrast gör strukturer lättare att avgränsa', 'Belysningen påverkar färgtonen men inte hur detaljer syns', 'Ljuset bestämmer vilken förstoring objektivet har'],
    rationales: ['Svag kontrast kan göra gränser och detaljer svårare att se.', 'Belysningen påverkar också hur tydligt strukturer kan urskiljas.', 'Förstoringen styrs av linserna, medan ljuset påverkar synlighet och kontrast.'],
    solution: 'Belysningen behöver ställas in så att kontrast och detaljer syns utan att bilden blir bländande.',
    summary: 'Sanitiserad grundning: delområdet kopplar observation till mikroskopets inställningar.',
    tags: ['ljus', 'observation']
  },
  {
    kp: '002',
    typ: 'samband',
    niva: 2,
    stem: 'Varför är det viktigt att ett biologiskt preparat är tunt när det ska mikroskoperas?',
    correct: 'Ljuset behöver kunna passera så att detaljer syns tydligt',
    wrong: ['Ett tjockare preparat ger tydligare konturer eftersom mer material syns', 'Preparatets tjocklek påverkar främst anteckningen, inte bilden', 'Högre förstoring kompenserar säkert för ett för tjockt prov'],
    rationales: ['Mer material kan i stället skymma detaljer när ljuset ska passera.', 'Tjockleken påverkar själva observationen, inte bara dokumentationen.', 'Högre förstoring löser inte problemet om ljus och fokus hindras av provets tjocklek.'],
    solution: 'Ett tunt preparat släpper igenom mer ljus och gör det lättare att urskilja strukturer.',
    summary: 'Sanitiserad grundning: delområdet behandlar hur preparatets egenskaper påverkar observationen.',
    tags: ['preparat', 'ljus']
  },
  {
    kp: '001',
    typ: 'förståelse',
    niva: 2,
    stem: 'En elev ser en suddig bild i mikroskopet. Vilken åtgärd är mest rimlig först?',
    correct: 'Justera fokus försiktigt med låg förstoring',
    wrong: ['Dra genast bort objektglaset medan man tittar i okularet', 'Anta att provet saknar celler', 'Höj alltid till högsta förstoring direkt'],
    rationales: ['Att flytta glaset okontrollerat kan göra observationen sämre och skada preparatet.', 'Suddig bild betyder inte automatiskt att celler saknas.', 'Högsta förstoring gör det ofta svårare att hitta och fokusera först.'],
    solution: 'Vid suddig bild är det klokt att börja med låg förstoring och försiktig fokusering.',
    summary: 'Sanitiserad grundning: delområdet tränar samband mellan mikroskopinställning och observation.',
    tags: ['fokus', 'observation']
  },
  {
    kp: '002',
    typ: 'mcq',
    niva: 2,
    stem: 'Vilket val förbättrar oftast en mikroskopobservation?',
    correct: 'Att justera ljus, fokus och förstoring stegvis',
    wrong: ['Att ändra inställningar utan att notera vad som ändras', 'Att rita förväntade detaljer i stället för det som syns', 'Att hoppa över märkning av preparatet'],
    rationales: ['Ospårade ändringar gör metoden svår att följa.', 'Observationen ska bygga på vad man faktiskt ser.', 'Märkning minskar risken att blanda ihop prover.'],
    solution: 'En stegvis metod gör observationen tydligare och lättare att kontrollera.',
    summary: 'Sanitiserad grundning: delområdet kopplar mikroskopering till kontrollerad metod.',
    tags: ['metod', 'observation']
  },
  {
    kp: '002',
    typ: 'resonemang',
    niva: 3,
    stem: 'Varför är det riskabelt att dra en slutsats efter bara en snabb mikroskopbild?',
    correct: 'Bilden kan vara påverkad av fokus, ljus, provets placering eller en felkälla',
    wrong: ['Ett tydligt synfält räcker för att representera hela preparatet', 'Förstoringen visar automatiskt vilken celltyp som är viktigast', 'En noggrann ritning ersätter behovet av metodbeskrivning'],
    rationales: ['Ett synfält kan vara urvalspåverkat och behöver ofta jämföras med fler observationer.', 'Förstoring hjälper observationen men avgör inte ensam biologisk tolkning.', 'Ritningen är användbar först när man också vet hur observationen gjordes.'],
    solution: 'En säker slutsats kräver kontrollerad metod och medvetenhet om vad som kan ha påverkat observationen.',
    summary: 'Sanitiserad grundning: delområdet kopplar mikroskopering till tolkning och metodkritik.',
    tags: ['metodkritik', 'felkälla']
  },
  {
    kp: '003',
    typ: 'modell',
    niva: 1,
    stem: 'Vad bör en enkel mikroskopskiss främst visa?',
    correct: 'De strukturer som faktiskt observeras, tydligt och utan onödiga detaljer',
    wrong: ['Allt eleven redan vet om organismen', 'Färger som valts för att bilden ska bli lättare att hitta i häftet', 'Samma standardskiss även när observationen visar andra former'],
    rationales: ['Skissen ska bygga på observationen, inte bara förkunskap.', 'Färgval hjälper inte om det saknar koppling till observerade strukturer.', 'Olika observationer ska kunna ge olika skisser.'],
    solution: 'En mikroskopskiss är en förenklad modell av observationen och ska visa relevanta strukturer tydligt.',
    summary: 'Sanitiserad grundning: delområdet använder bilder och modeller som stöd för mikroskopobservation.',
    tags: ['skiss', 'modell']
  },
  {
    kp: '003',
    typ: 'modell',
    niva: 2,
    stem: 'Varför ska en mikroskopskiss gärna ha rubrik eller märkning?',
    correct: 'Det gör det tydligt vad skissen visar och vilka delar som observerats',
    wrong: ['Det ersätter själva observationen', 'Det gör att skissen inte behöver stämma', 'Det används bara för att fylla sidan'],
    rationales: ['Märkning kompletterar observationen men ersätter den inte.', 'En märkt skiss måste fortfarande bygga på det man ser.', 'Rubrik och märkning hjälper tolkning och kommunikation.'],
    solution: 'Märkning gör skissen mer användbar eftersom andra kan förstå vad som har observerats.',
    summary: 'Sanitiserad grundning: delområdet tränar hur mikroskopobservationer dokumenteras.',
    tags: ['dokumentation', 'modell']
  },
  {
    kp: '003',
    typ: 'modell',
    niva: 2,
    stem: 'En skiss visar celler som perfekta cirklar fast bilden visar oregelbundna former. Vad är problemet?',
    correct: 'Skissen återger inte observationen tillräckligt sakligt',
    wrong: ['Skisser behöver vara lika detaljerade som ett fotografi', 'Oregelbundna former bör jämnas ut för att skissen ska bli snygg', 'Formen i bilden spelar mindre roll än att skissen blir symmetrisk'],
    rationales: ['En skiss får förenkla men ska fortfarande bygga på det observerade.', 'Oregelbundna former kan vara biologiskt relevanta och ska inte snyggas till utan belägg.', 'Symmetri är mindre viktig än att återge de former som faktiskt syns.'],
    solution: 'En bra skiss förenklar men bör inte hitta på former som inte stämmer med observationen.',
    summary: 'Sanitiserad grundning: delområdet kopplar bildtolkning till observation och dokumentation.',
    tags: ['modellkritik', 'observation']
  },
  {
    kp: '005',
    typ: 'metod',
    niva: 3,
    stem: 'Varför är en uppgift om skala eller förstoring användbar tillsammans med en mikroskopbild?',
    correct: 'Den hjälper läsaren att förstå storleken på det som observeras',
    wrong: ['Den visar vilken art provet måste vara', 'Den beskriver hur stark belysningen var', 'Den ersätter märkning av vilka delar bilden visar'],
    rationales: ['Storleksinformation avgör inte ensam vilken art det är.', 'Skala och förstoring handlar om storlek, inte direkt om ljusstyrka.', 'Skala kompletterar märkning men förklarar inte vilka delar som syns.'],
    solution: 'Förstoring eller skala gör det lättare att tolka hur små strukturerna är i verkligheten.',
    summary: 'Sanitiserad grundning: delområdet behandlar mikroskopbilder som modeller med storleksinformation.',
    tags: ['skala', 'förstoring']
  },
  {
    kp: '003',
    typ: 'mcq',
    niva: 2,
    stem: 'Vad är en rimlig regel när man ritar av något från mikroskopet?',
    correct: 'Rita det du ser och markera viktiga delar tydligt',
    wrong: ['Rita in delar som borde finnas enligt förkunskap', 'Lämna rubrik och märkning tills efter slutsatsen', 'Byt prov om bilden är svår utan att anteckna det'],
    rationales: ['Att lägga till delar utan belägg gör dokumentationen osäker.', 'Rubrik och märkning behövs för att skissen ska kunna förstås och granskas.', 'Metodproblem bör noteras i stället för att döljas.'],
    solution: 'Mikroskopskissen ska vara saklig dokumentation av observationen med tydliga markeringar.',
    summary: 'Sanitiserad grundning: delområdet kopplar mikroskopisk observation till dokumentation.',
    tags: ['skiss', 'metod']
  },
  {
    kp: '003',
    typ: 'jämförelse',
    niva: 1,
    stem: 'Vad skiljer observation från tolkning när man mikroskoperar?',
    correct: 'Observation är vad man ser; tolkning är vad man tror att det betyder',
    wrong: ['Observation och tolkning kan slås ihop om eleven är säker', 'Tolkning bör göras innan bilden har justerats', 'Observation betyder att välja den förklaring som känns rimlig'],
    rationales: ['De hänger ihop men är inte samma steg.', 'Tolkning bör bygga på observation, inte ersätta den.', 'Observation handlar om att registrera det som syns.'],
    solution: 'En bra undersökning skiljer mellan vad som faktiskt syns och slutsatsen man drar av det.',
    summary: 'Sanitiserad grundning: delområdet tränar mikroskopering som metod och observation.',
    tags: ['observation', 'tolkning']
  },
  {
    kp: '004',
    typ: 'jämförelse',
    niva: 2,
    stem: 'Vilken skillnad finns mellan objektglas och täckglas?',
    correct: 'Objektglaset bär provet, medan täckglaset läggs ovanpå för att hålla preparatet plant',
    wrong: ['Täckglaset är den lins som förstorar bilden', 'Objektglaset används främst för att mäta provets temperatur', 'De kan byta funktion utan att preparatet påverkas'],
    rationales: ['Linsen man tittar genom är okular, inte täckglas.', 'Objektglaset används som bärare för preparatet.', 'De kan likna varandra men har olika roller i preparatet.'],
    solution: 'Objektglas och täckglas samverkar, men de har olika roller när man gör ett preparat.',
    summary: 'Sanitiserad grundning: delområdet behandlar material och metod vid mikroskopering.',
    tags: ['preparat', 'jämförelse']
  },
  {
    kp: '005',
    typ: 'jämförelse',
    niva: 2,
    stem: 'Vad skiljer låg förstoring från hög förstoring i praktiskt arbete?',
    correct: 'Låg förstoring ger överblick, hög förstoring ger mer detalj i ett mindre område',
    wrong: ['Hög förstoring gör preparatet större i verkligheten', 'Låg förstoring används främst efter att slutsatsen är färdig', 'Förstoring påverkar bara ljusstyrkan och inte synfältet'],
    rationales: ['Förstoringen ändrar bilden, inte provets verkliga storlek.', 'Låg förstoring är viktig tidigt för att hitta rätt område.', 'Synfältet brukar minska när förstoring ökar.'],
    solution: 'Man använder ofta låg förstoring för att hitta provet och högre förstoring för detaljer.',
    summary: 'Sanitiserad grundning: delområdet jämför metodval vid mikroskopering.',
    tags: ['förstoring', 'synfält']
  },
  {
    kp: '004',
    typ: 'förståelse',
    niva: 3,
    stem: 'Varför behöver man ibland jämföra flera delar av samma preparat?',
    correct: 'En enda synbild kan vara atypisk eller påverkad av placering och felkällor',
    wrong: ['Delarna av ett preparat bör behandlas som identiska om de ligger på samma glas', 'Jämförelser gör observationen svagare eftersom de ger fler data', 'Man bör välja ett område och dölja varför det valdes'],
    rationales: ['Biologiska preparat kan variera mellan olika delar.', 'Jämförelser kan tvärtom stärka observationen när de görs systematiskt.', 'Urvalet av område bör vara öppet så att observationen kan granskas.'],
    solution: 'Flera observationer gör det lättare att avgöra om det man ser är typiskt för provet.',
    summary: 'Sanitiserad grundning: delområdet tränar jämförelse och metodkritik i observation.',
    tags: ['jämförelse', 'preparat']
  },
  {
    kp: '002',
    typ: 'mcq',
    niva: 2,
    stem: 'Vilket par jämför två olika delar av mikroskoperingsarbetet?',
    correct: 'Att ställa in fokus och att dokumentera observationen',
    wrong: ['Att tolka bilden och att skriva av en färdig facittext', 'Att byta preparat och att ändra rubriken i efterhand', 'Att använda samma anteckning för alla observationer'],
    rationales: ['Tolkning och facitavskrift tränar inte två observerade metoddelar.', 'Att byta preparat och rubrik beskriver inte samma metodjämförelse.', 'Samma anteckning för alla observationer gör jämförelsen svagare.'],
    solution: 'Fokusering och dokumentation är olika men båda viktiga delar av mikroskoperingsarbetet.',
    summary: 'Sanitiserad grundning: delområdet skiljer mellan metodsteg vid mikroskopering.',
    tags: ['metod', 'dokumentation']
  },
  {
    kp: '006',
    typ: 'metod',
    niva: 1,
    stem: 'Vilket exempel är en möjlig felkälla vid mikroskopering?',
    correct: 'Luftbubblor eller smuts hamnar i preparatet',
    wrong: ['Att skriva vad man ser', 'Att börja med låg förstoring', 'Att använda ljus för att se provet'],
    rationales: ['Att anteckna observationer är en del av god dokumentation.', 'Låg förstoring kan vara ett bra första steg.', 'Ljus behövs i ett ljusmikroskop och är inte i sig en felkälla.'],
    solution: 'Luftbubblor, smuts eller fel fokus kan göra bilden svårtolkad och påverka slutsatsen.',
    summary: 'Sanitiserad grundning: delområdet behandlar felkällor i mikroskopisk observation.',
    tags: ['felkälla', 'metod']
  },
  {
    kp: '006',
    typ: 'metod',
    niva: 2,
    stem: 'En elev ser en mörk rund fläck och säger direkt att det är en cellkärna. Vad bör eleven göra först?',
    correct: 'Kontrollera fokus, jämföra med fler delar av preparatet och överväga felkällor',
    wrong: ['Skriva slutsatsen utan fler kontroller', 'Anta att mörka fläckar i provet har samma biologiska betydelse', 'Stryka metodanteckningar som inte passar slutsatsen'],
    rationales: ['En snabb slutsats kan bli fel om bilden är otydlig.', 'Mörka fläckar kan ha flera orsaker i ett preparat.', 'Anteckningar behövs för att granska observationen.'],
    solution: 'Tolkningen bör prövas mot fler observationer och möjliga felkällor innan den används som slutsats.',
    summary: 'Sanitiserad grundning: delområdet kopplar mikroskopering till källkritisk observation.',
    tags: ['felkälla', 'tolkning']
  },
  {
    kp: '006',
    typ: 'resonemang',
    niva: 2,
    stem: 'Varför bör man anteckna om bilden var svår att fokusera?',
    correct: 'Det hjälper andra att bedöma hur säker observationen är',
    wrong: ['Det gör felkällor omöjliga', 'Det ersätter hela resultatet', 'Det visar att observationer inte behövs'],
    rationales: ['Felkällor kan finnas även när man antecknar dem.', 'En metodanteckning kompletterar resultatet men ersätter det inte.', 'Observationen är fortfarande grunden för resultatet.'],
    solution: 'Osäkerheter i metoden påverkar hur starkt man kan lita på slutsatsen och bör därför dokumenteras.',
    summary: 'Sanitiserad grundning: delområdet tränar metodkritik vid biologiska observationer.',
    tags: ['metodkritik', 'dokumentation']
  },
  {
    kp: '004',
    typ: 'förståelse',
    niva: 3,
    stem: 'Varför kan för mycket färgämne i ett preparat vara ett problem?',
    correct: 'Det kan dölja detaljer eller göra strukturer svåra att skilja åt',
    wrong: ['Det påverkar bara färgen på anteckningen efteråt', 'Det betyder att förstoringen behöver anges i procent', 'Det visar vilka delar som är viktigast utan ytterligare tolkning'],
    rationales: ['Färgämnet påverkar själva bilden och vad som går att urskilja.', 'Förstoring anges inte i procent för att färgämnet ändras.', 'Färg kan hjälpa kontrasten men avgör inte ensam vilka delar som är viktigast.'],
    solution: 'Färgämnen kan hjälpa kontrasten, men för mycket färg kan skapa en felkälla i tolkningen.',
    summary: 'Sanitiserad grundning: delområdet behandlar hur metodval kan påverka mikroskopbilden.',
    tags: ['preparat', 'observation']
  },
  {
    kp: '006',
    typ: 'mcq',
    niva: 2,
    stem: 'Vilken slutsats är bäst om två elever ser olika saker i samma preparat?',
    correct: 'De bör jämföra metod, fokus och vilken del av preparatet de tittade på',
    wrong: ['De bör bara behålla den observation som verkar enklast', 'De bör slå ihop observationerna utan att kontrollera metoden', 'De bör bortse från vilken förstoring som användes'],
    rationales: ['Enklast observation är inte automatiskt mest tillförlitlig.', 'Olika observationer behöver kontrolleras innan de slås ihop.', 'Förstoring kan påverka vad som går att se i bilden.'],
    solution: 'Skillnader bör undersökas genom att jämföra metodsteg och observationer innan slutsats dras.',
    summary: 'Sanitiserad grundning: delområdet kopplar felkällor till jämförbara observationer.',
    tags: ['felkälla', 'jämförelse']
  },
  {
    kp: '007',
    typ: 'samband',
    niva: 1,
    stem: 'Hur hänger mikroskopering ihop med biologiska samband?',
    correct: 'Den kan visa strukturer som hjälper oss koppla form till funktion',
    wrong: ['Den visar strukturer men tolkningen kan göras frikopplad från observationen', 'Den är den enda metod som behövs för biologiska samband', 'Den gör funktioner tydliga utan jämförelse med andra belägg'],
    rationales: ['Tolkning behöver kopplas till belägg och metod, inte bara till en lös idé.', 'Mikroskopering är en metod bland flera.', 'Funktion behöver ofta tolkas med fler belägg än en bild.'],
    solution: 'Genom att observera strukturer kan man resonera om hur de hänger ihop med funktioner i levande organismer.',
    summary: 'Sanitiserad grundning: delområdet kopplar mikroskopering till biologisk förståelse.',
    tags: ['struktur', 'funktion']
  },
  {
    kp: '007',
    typ: 'samband',
    niva: 2,
    stem: 'En elev ser tydliga avgränsningar i ett preparat. Vilken slutsats är säkrast?',
    correct: 'Det är en observation som kan användas som underlag, men strukturerna behöver identifieras försiktigt',
    wrong: ['Avgränsningarna bevisar direkt exakt vilken funktion varje del har', 'Avgränsningarna betyder att fokus inte behöver kontrolleras', 'Avgränsningarna gör att fler observationer blir onödiga'],
    rationales: ['En synlig struktur behöver tolkas med fler belägg innan funktion anges.', 'Tydliga former kan fortfarande påverkas av fokus.', 'Fler observationer kan stärka eller korrigera tolkningen.'],
    solution: 'Mikroskopbilden ger ett underlag, men identifiering och funktion behöver kontrolleras med metod och jämförelse.',
    summary: 'Sanitiserad grundning: delområdet använder mikroskopering för försiktig tolkning av observerade strukturer.',
    tags: ['struktur', 'tolkning']
  },
  {
    kp: '007',
    typ: 'förståelse',
    niva: 2,
    stem: 'Varför räcker det inte alltid att bara se en form i mikroskopet för att veta dess funktion?',
    correct: 'Funktion behöver ofta stöd av fler observationer eller biologisk kunskap',
    wrong: ['Form och funktion kan jämställas utan extra belägg', 'Liknande former ger samma funktion i varje sammanhang', 'Mikroskopbilden ger slutsatsen utan att metoden behöver vägas in'],
    rationales: ['Form kan ge ledtrådar men funktionen behöver tolkas med belägg.', 'Liknande former kan ha olika betydelse beroende på sammanhang.', 'Mikroskopet ger observationer, inte färdiga slutsatser.'],
    solution: 'Mikroskopbilden ger belägg, men funktionen måste tolkas med metod, jämförelse och biologisk kunskap.',
    summary: 'Sanitiserad grundning: delområdet tränar relationen mellan observation och biologisk förklaring.',
    tags: ['tolkning', 'funktion']
  },
  {
    kp: '004',
    typ: 'resonemang',
    niva: 3,
    stem: 'Hur kan mikroskopering bidra till att jämföra olika organismer?',
    correct: 'Man kan jämföra cellstrukturer och använda skillnaderna som biologiska belägg',
    wrong: ['Man kan jämföra observationer men hoppa över metodanteckningar', 'Man kan utgå från en enda otydlig bild som säkert facit', 'Man kan jämföra namn utan att beskriva det som syns'],
    rationales: ['Metodanteckningar behövs för att jämförelsen ska kunna granskas.', 'En otydlig bild är ett svagt underlag för säker jämförelse.', 'Jämförelsen bör bygga på observerbara drag, inte bara namn.'],
    solution: 'Mikroskopering kan ge observerbara likheter och skillnader som hjälper biologiska jämförelser.',
    summary: 'Sanitiserad grundning: delområdet kopplar mikroskopisk observation till biologiska samband.',
    tags: ['jämförelse', 'belägg']
  },
  {
    kp: '001',
    typ: 'mcq',
    niva: 2,
    stem: 'Vilken fråga kan mikroskopering hjälpa till att undersöka?',
    correct: 'Vilka strukturer som syns i ett cellprov',
    wrong: ['Vilken väderförändring som pågår utanför klassrummet', 'Vilken förklaring som känns mest bekant före observationen', 'Vilken anteckning som är kortast att skriva'],
    rationales: ['Väderförändringar undersöks med andra metoder än mikroskopering.', 'Bekant känsla är inte samma sak som mikroskopisk observation.', 'Kortast anteckning säger inget om biologiska strukturer.'],
    solution: 'Mikroskopering lämpar sig för frågor om små strukturer i prov, till exempel celler och delar av celler.',
    summary: 'Sanitiserad grundning: delområdet visar vilka biologiska frågor mikroskopering kan stödja.',
    tags: ['frågeställning', 'mikroskop']
  },
  {
    kp: '007',
    typ: 'begrepp',
    niva: 1,
    stem: 'Vilket exempel visar en rimlig koppling mellan observation och biologisk funktion?',
    correct: 'Att en synlig struktur kan ge en ledtråd om vad den gör, om tolkningen stöds av belägg',
    wrong: ['Att en suddig form räcker för att bestämma funktion utan kontroll', 'Att utrustningens placering avgör vad strukturen gör', 'Att alla synliga delar måste ha samma funktion'],
    rationales: ['En suddig form är ett svagt underlag utan kontroll.', 'Utrustningens placering påverkar observationen men avgör inte biologisk funktion.', 'Synliga delar kan ha olika funktioner och måste tolkas var för sig.'],
    solution: 'Mikroskopering kan ge ledtrådar om funktion, men slutsatsen behöver stöd av tydlig observation och biologisk kunskap.',
    summary: 'Sanitiserad grundning: delområdet kopplar mikroskopering till försiktig biologisk tolkning.',
    tags: ['funktion', 'belägg']
  },
  {
    kp: '006',
    typ: 'begrepp',
    niva: 2,
    stem: 'Vilket påstående om funktion är mest försiktigt och metodiskt?',
    correct: 'En möjlig funktion bör beskrivas som en tolkning tills den stöds av fler observationer',
    wrong: ['En möjlig funktion bör anges som slutsats om formen verkar tydlig', 'En enda okänd form räcker om den liknar ett exempel från en annan bild', 'Funktion kan kopplas till observationen utan att osäkerheten skrivs ut'],
    rationales: ['En tydlig form kan ge en ledtråd men funktionen behöver fortfarande prövas.', 'Likhet med en annan bild är ett svagt stöd om strukturen inte identifierats.', 'Osäkerhet behöver synas när funktionen bara är en tolkning.'],
    solution: 'Det är bättre att skilja säker observation från tolkning och låta fler belägg stärka funktionsförklaringen.',
    summary: 'Sanitiserad grundning: delområdet tränar hur mikroskopobservationer används som belägg.',
    tags: ['funktion', 'metodkritik']
  },
  {
    kp: '007',
    typ: 'förståelse',
    niva: 2,
    stem: 'Varför ska man vara försiktig med att säga vad en okänd struktur gör?',
    correct: 'Funktionen behöver stöd av observation, jämförelse och tidigare biologisk kunskap',
    wrong: ['Okända strukturer kan namnges utifrån första intrycket', 'Synliga strukturer i en cell bör tolkas som samma typ av del', 'Funktion kan avgöras genom den förklaring som passar rubriken bäst'],
    rationales: ['Första intrycket behöver kontrolleras mot fler observationer.', 'Celler har olika strukturer med olika uppgifter.', 'Rubriken kan hjälpa sammanhanget men ersätter inte observation och jämförelse.'],
    solution: 'En struktur kan föreslås ha en funktion, men slutsatsen blir starkare med fler belägg.',
    summary: 'Sanitiserad grundning: delområdet kopplar mikroskopering till försiktig biologisk tolkning.',
    tags: ['tolkning', 'belägg']
  }
];

const batches = [
  {
    idPrefix: 'bio-q-k1-sec01',
    importBatchId,
    bookLocationId,
    sourceClaimId,
    sourceAtomId,
    chapterCode,
    delkapitel,
    stella: 'Stella Biologi K1 delområde 1',
    authored
  },
  {
    idPrefix: 'bio-q-k1-sec02',
    importBatchId: 'biologi-k1-sec02-offline-batch-20260518',
    bookLocationId: 'bookedition-stella-biologi-ocr-v1:biologi-kap1-sec02',
    sourceClaimId: 'sourceclaim-bookedition-stella-biologi-ocr-v1-biologi-kap1-sec02',
    sourceAtomId: 'source-atom-bookedition-stella-biologi-ocr-v1-biologi-kap1-sec02',
    chapterCode: 'K1',
    delkapitel: 'K1-biologi-kap1-sec02',
    stella: 'Stella Biologi K1 delområde 2',
    authored: authoredSec02
  }
];

const existing = readJsonl('questions/intake-candidates.jsonl').filter((candidate) => {
  return !batches.some((batch) => candidate.id.startsWith(`${batch.idPrefix}-`));
});
const atomicKps = new Set(readJsonl('lineage/atomic-knowledge-points.jsonl').map((row) => row.id));
const sourceAtoms = new Set(readJsonl('lineage/source-atoms.jsonl').map((row) => row.id));
for (const batch of batches) {
  if (!sourceAtoms.has(batch.sourceAtomId)) throw new Error(`Missing source atom: ${batch.sourceAtomId}`);
}

const candidates = batches.flatMap((batch, batchIndex) => batch.authored.map((item, index) => {
  const id = `${batch.idPrefix}-${String(index + 1).padStart(3, '0')}`;
  const sectionId = batch.bookLocationId.split(':').at(-1);
  const knowledgePointId = `kp-biologi-${sectionId}-${item.kp}`;
  if (!atomicKps.has(knowledgePointId)) throw new Error(`Missing KP: ${knowledgePointId}`);
  const correctIndex = (index + batchIndex) % 4;
  const options = optionRows(item.correct, item.wrong, correctIndex);
  const correctOptionId = options.find((option) => option.text === item.correct)?.id;
  if (!correctOptionId) throw new Error(`Missing correct option for ${id}`);
  const candidate = {
    id,
    subject,
    bookEditionId,
    chapterCode: batch.chapterCode,
    status: 'candidate_review_required',
    activationReviewStatus: 'not_reviewed',
    format: 'multiple_choice',
    studentStem: item.stem,
    options,
    correctOptionId,
    distractorRationales: options
      .filter((option) => option.id !== correctOptionId)
      .map((option) => ({
        optionId: option.id,
        rationale: item.rationales[item.wrong.indexOf(option.text)]
      })),
    solution: item.solution,
    publicSanitizedSourceSummary: item.summary,
    bookLocationIds: [batch.bookLocationId],
    sourceClaimIds: [batch.sourceClaimId],
    knowledgePointIds: [knowledgePointId],
    questionKnowledgeLinks: [
      {
        questionId: id,
        knowledgePointId,
        linkType: 'primary',
        weight: 1
      }
    ],
    runtimeProjection: {
      typ: item.typ,
      niva: item.niva,
      delkapitel: batch.delkapitel,
      stella: batch.stella
    },
    difficultyLevel: item.niva,
    enabledLevels: [`niva-${item.niva}`],
    skillTags: [...new Set(item.tags)],
    abilityTags: ['begreppslig-förståelse'],
    techniqueTags: ['flerval', 'distraktoranalys'],
    metadataCompleteness: metadataCompleteness(),
    contentHash: '',
    importBatchId: batch.importBatchId,
    createdFromSourceId: batch.sourceAtomId,
    validationReport: falseValidationReport(),
    reviewStatus: 'candidate_review_required'
  };
  candidate.contentHash = hash({
    id: candidate.id,
    stem: candidate.studentStem,
    options: candidate.options,
    correctOptionId: candidate.correctOptionId,
    solution: candidate.solution,
    knowledgePointIds: candidate.knowledgePointIds
  });
  return candidate;
}));

const rows = [...existing, ...candidates].sort((a, b) => a.id.localeCompare(b.id));
if (write) writeFileSync(join(root, 'questions/intake-candidates.jsonl'), rows.map((row) => JSON.stringify(row)).join('\n') + '\n');

console.log(JSON.stringify({
  ok: true,
  write,
  importBatchIds: batches.map((batch) => batch.importBatchId),
  generatedCandidates: candidates.length,
  totalCandidates: rows.length,
  runtimeImportAllowed: false,
  kvWriteAllowed: false,
  safeActiveWriteAllowed: false,
  pixelWriteAllowed: false
}, null, 2));
