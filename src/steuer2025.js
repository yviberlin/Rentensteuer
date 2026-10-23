// Rechenkern: Einkommensteuer für Rentner, Steuerjahr 2025.
// Reine Funktionen ohne DOM, damit sie im Browser und in Tests laufen.

const P2025 = {
  jahr: 2025,
  grundfreibetrag: 12096,
  wkPauschale22: 102,          // § 9a Nr. 3 (Renten, Betriebsrenten nach § 22)
  wkPauschaleVersorgung: 102,  // § 9a Nr. 1b (Versorgungsbezüge nach § 19)
  wkPauschaleArbeit: 1230,     // § 9a Nr. 1a (Arbeitslohn, Platzhalter)
  sonderausgabenPausch: 36,    // je Person
  sparerPausch: 1000,          // je Person
  haushaltsersparnis: 12096,   // je Jahr bei Auflösung des Haushalts (Pflegeheim)
  zumutbar: { grenzen: [15340, 51130], allein: [0.05, 0.06, 0.07], paar: [0.04, 0.05, 0.06] },
  behinderung: { 20: 384, 30: 620, 40: 860, 50: 1140, 60: 1440, 70: 1780, 80: 2120, 90: 2460, 100: 2840 },
  behinderungHilflos: 7400,
  pflegePausch: { 2: 600, 3: 1100, 4: 1800, 5: 1800 },
  fahrtPausch: { normal: 900, erhoeht: 4500 },
  parteiHoechst: 1650,         // je Person, § 34g und § 10b Abs. 2
  spendenAnteil: 0.20,         // höchstens 20 % des Gesamtbetrags der Einkünfte
  ermaessigung35a: { haushalt: 4000, minijob: 510, handwerker: 1200, satz: 0.20 },
  vorsorgeHoechst: 1900,       // sonstige Vorsorge, je Person (Rentner)
  soliFreigrenze: 19950,       // je Grundtarif, doppelt bei Splitting
  abgeltungSatz: 0.25,
  // Krankenversicherung der Rentner (gesetzlich), für die Schätzung
  kv: { allgemein: 0.146, zusatzDurchschnitt: 0.025, pv: 0.036, pvKinderlos: 0.042, freibetragMonat: 187.25 },
};

// § 32a EStG, Tarif 2025
function tarif2025(zvE) {
  const x = Math.floor(zvE);
  let st;
  if (x <= 12096) st = 0;
  else if (x <= 17443) { const y = (x - 12096) / 10000; st = (932.30 * y + 1400) * y; }
  else if (x <= 68480) { const z = (x - 17443) / 10000; st = (176.64 * z + 2397) * z + 1015.13; }
  else if (x <= 277825) st = 0.42 * x - 10911.92;
  else st = 0.45 * x - 19246.67;
  return Math.floor(st);
}

function einkommensteuer(zvE, splitting) {
  if (zvE <= 0) return 0;
  return splitting ? 2 * tarif2025(Math.floor(zvE / 2)) : tarif2025(zvE);
}

// Besteuerungsanteil der gesetzlichen Rente nach Jahr des Rentenbeginns (§ 22 Nr. 1 S. 3 a aa)
function besteuerungsanteil(beginn) {
  if (beginn <= 2005) return 0.50;
  if (beginn <= 2020) return Math.round((0.50 + 0.02 * (beginn - 2005)) * 1000) / 1000;
  const tab = { 2021: 0.81, 2022: 0.82, 2023: 0.825, 2024: 0.83, 2025: 0.835 };
  return tab[beginn] ?? 0.835;
}

// Versorgungsfreibetrag und Zuschlag nach Jahr des Versorgungsbeginns (§ 19 Abs. 2)
function versorgungsfreibetragWerte(beginn) {
  let n;
  if (beginn <= 2005) return { satz: 0.40, max: 3000, zuschlag: 900 };
  if (beginn <= 2020) { n = beginn - 2005; return r3({ satz: 0.40 - 0.016 * n, max: 3000 - 120 * n, zuschlag: 900 - 36 * n }); }
  if (beginn <= 2022) { n = beginn - 2020; return r3({ satz: 0.16 - 0.008 * n, max: 1200 - 60 * n, zuschlag: 360 - 18 * n }); }
  n = Math.min(beginn, 2025) - 2022;
  return r3({ satz: 0.144 - 0.004 * n, max: 1080 - 30 * n, zuschlag: 324 - 9 * n });
}

// Altersentlastungsbetrag (§ 24a), gilt ab dem Jahr nach dem 64. Geburtstag
function altersentlastungWerte(geburtsjahr) {
  if (!geburtsjahr || geburtsjahr > 1960) return null; // 64 erst nach dem 1.1.2025
  const j = geburtsjahr + 65; // erstes begünstigtes Jahr
  let n;
  if (j <= 2005) return { satz: 0.40, max: 1900 };
  if (j <= 2020) { n = j - 2005; return r3({ satz: 0.40 - 0.016 * n, max: 1900 - 76 * n }); }
  if (j <= 2022) { n = j - 2020; return r3({ satz: 0.16 - 0.008 * n, max: 760 - 38 * n }); }
  n = j - 2022;
  return r3({ satz: 0.144 - 0.004 * n, max: 684 - 19 * n });
}

const r2 = v => Math.round(v * 100) / 100;
const r3 = o => { for (const k in o) o[k] = Math.round(o[k] * 1000) / 1000; return o; };
const pos = v => Math.max(0, Number(v) || 0);

// Grobe Schätzung der eigenen KV/PV-Beiträge für gesetzlich Versicherte (KVdR)
function schaetzeKvPv(person, p = P2025) {
  const k = p.kv;
  const rente = pos(person.gesRente) + pos(person.witwenrente);
  const bav = pos(person.versorgungsbezuege) + pos(person.betriebsrente22);
  const pvSatz = person.kinderlos ? k.pvKinderlos : k.pv;
  let kv = rente * (k.allgemein + k.zusatzDurchschnitt) / 2;
  let pv = rente * pvSatz;
  const bavMonat = bav / 12;
  if (bavMonat > 0) {
    kv += Math.max(0, bavMonat - k.freibetragMonat) * 12 * (k.allgemein + k.zusatzDurchschnitt);
    if (bavMonat > k.freibetragMonat) pv += bav * pvSatz;
  }
  return Math.round(kv + pv);
}

// Einkünfte einer Person (ohne Kapitalerträge)
function einkuenftePerson(person, p = P2025) {
  const zeilen = [];
  const wkTatsaechlich = pos(person.werbungskostenRente);
  const wk22Basis = Math.max(p.wkPauschale22, wkTatsaechlich);
  let wk22Rest = wk22Basis;

  // Gesetzliche Rente und Witwen-/Witwerrente: jede mit eigenem Anteil und Freibetrag
  function renteTeil(betrag, beginn, anteilsJahr, fbBekannt, art, label, zusatz = '') {
    if (betrag <= 0) return 0;
    const anteil = besteuerungsanteil(anteilsJahr);
    let freibetrag, fbHinweis;
    if (beginn < p.jahr && fbBekannt > 0) { freibetrag = fbBekannt; fbHinweis = 'laut Bescheid'; }
    else { freibetrag = r2(betrag * (1 - anteil)); fbHinweis = beginn < p.jahr ? 'geschätzt' : 'Rentenbeginn 2025'; }
    zeilen.push({ art, label, brutto: betrag, abzug: freibetrag,
      detail: `Besteuerungsanteil ${(anteil * 100).toLocaleString('de-DE')} %${zusatz}, Rentenfreibetrag ${fbHinweis}.` });
    return Math.max(0, betrag - freibetrag);
  }
  const rente = pos(person.gesRente);
  const beginnEigen = Number(person.rentenbeginn) || p.jahr;
  let renteSteuerpflichtig = renteTeil(rente, beginnEigen, beginnEigen, pos(person.rentenfreibetrag), 'gesRente', 'Gesetzliche Rente');

  // Folgerente (§ 22 Nr. 1 S. 3 a aa S. 8): Laufzeit der Rente des verstorbenen Partners wird angerechnet,
  // der Anteil richtet sich dann nach dessen Rentenbeginn, frühestens 2005.
  const witwe = pos(person.witwenrente);
  const beginnWitwe = Number(person.witwenBeginn) || p.jahr;
  const vorrente = Number(person.vorrenteBeginn) || 0;
  const jahrWitwe = vorrente > 0 && vorrente < beginnWitwe ? Math.max(2005, vorrente) : beginnWitwe;
  renteSteuerpflichtig += renteTeil(witwe, beginnWitwe, jahrWitwe, pos(person.witwenFreibetrag), 'witwenrente', 'Witwen- oder Witwerrente',
    jahrWitwe !== beginnWitwe ? ` (nach Rentenbeginn des Partners ${jahrWitwe})` : '');
  const wkRente = Math.min(wk22Rest, renteSteuerpflichtig);
  wk22Rest -= wkRente;
  const einkRente = renteSteuerpflichtig - wkRente;

  // Betriebsrente aus Direktversicherung, Pensionskasse, Pensionsfonds (§ 22 Nr. 5)
  const bav22 = pos(person.betriebsrente22);
  const wkBav = Math.min(wk22Rest, bav22);
  wk22Rest -= wkBav;
  const einkBav22 = bav22 - wkBav;
  if (bav22 > 0) zeilen.push({ art: 'bav22', label: 'Betriebsrente (Direktversicherung, Pensionskasse, Pensionsfonds)', brutto: bav22, abzug: 0, detail: 'Voll steuerpflichtig.' });
  const wk22 = wk22Basis - wk22Rest;
  if (wk22 > 0) zeilen.push({ art: 'wk22', label: wkTatsaechlich > p.wkPauschale22 ? 'Werbungskosten zur Rente' : 'Werbungskosten-Pauschbetrag Renten', brutto: 0, abzug: wk22,
    detail: wkTatsaechlich > p.wkPauschale22 ? 'Tatsächliche Kosten, höher als 102 € pauschal.' : '102 € pauschal' });

  // Werkspension / Betriebspension als Versorgungsbezug (§ 19)
  const vb = pos(person.versorgungsbezuege);
  let einkVb = 0;
  if (vb > 0) {
    const w = versorgungsfreibetragWerte(Number(person.versorgungsbeginn) || p.jahr);
    const vfb = Math.min(vb * w.satz, w.max);
    const freiGesamt = Math.min(vb, Math.ceil(vfb) + w.zuschlag);
    const wk = Math.min(p.wkPauschaleVersorgung, vb - freiGesamt);
    einkVb = vb - freiGesamt - wk;
    zeilen.push({ art: 'vb', label: 'Werkspension (Versorgungsbezug)', brutto: vb, abzug: freiGesamt + wk,
      detail: `Versorgungsfreibetrag ${Math.round(freiGesamt)} € inkl. Zuschlag, 102 € Werbungskosten.` });
  }

  // Platzhalter: Nebenjob (Arbeitslohn), Vermietung, Selbständig, private Rente
  const lohn = pos(person.arbeitslohn);
  const einkLohn = Math.max(0, lohn - Math.min(p.wkPauschaleArbeit, lohn));

  // Grundlage Altersentlastungsbetrag: Arbeitslohn (ohne Versorgungsbezüge) und
  // übrige Einkünfte ohne gesetzliche Rente; voll steuerpflichtige Betriebsrente nach § 22 Nr. 5 zählt mit.
  const aeBasisOhneKapital = lohn + einkBav22;

  return {
    zeilen,
    summe: einkRente + einkBav22 + einkVb + einkLohn,
    aeBasisOhneKapital,
    teile: { einkRente, einkBav22, einkVb, einkLohn },
  };
}

function altersentlastung(person, basis) {
  const w = altersentlastungWerte(Number(person.geburtsjahr));
  if (!w || basis <= 0) return 0;
  return Math.min(Math.ceil(Math.round(basis * w.satz * 100) / 100), w.max);
}

// Pauschbeträge bei Behinderung und Pflege (§ 33b)
function behindertenPauschbetrag(person, p = P2025) {
  const pg = Number(person.pflegegrad) || 0;
  if (person.merkH || person.merkBl || person.merkTBl || pg >= 4) return p.behinderungHilflos;
  const gdb = Math.floor((Number(person.gdb) || 0) / 10) * 10;
  return gdb >= 20 ? p.behinderung[Math.min(gdb, 100)] : 0;
}
function fahrtkostenPauschale(person, p = P2025) {
  const gdb = Number(person.gdb) || 0, pg = Number(person.pflegegrad) || 0;
  if (person.merkAG || person.merkBl || person.merkTBl || person.merkH || pg >= 4) return p.fahrtPausch.erhoeht;
  if (gdb >= 80 || (gdb >= 70 && person.merkG)) return p.fahrtPausch.normal;
  return 0;
}
function pflegePauschbetrag(person, p = P2025) {
  return p.pflegePausch[Number(person.pflegtAngehoerigePG) || 0] || 0;
}

// Zumutbare Belastung (§ 33 Abs. 3), stufenweise, ohne Kinder
function zumutbareBelastung(gde, verheiratet, p = P2025) {
  const g = p.zumutbar.grenzen, s = verheiratet ? p.zumutbar.paar : p.zumutbar.allein;
  const x = Math.max(0, gde);
  const st1 = Math.min(x, g[0]) * s[0];
  const st2 = Math.max(0, Math.min(x, g[1]) - g[0]) * s[1];
  const st3 = Math.max(0, x - g[1]) * s[2];
  return Math.round(st1 + st2 + st3);
}

// Summe der Krankheitskosten aus den Unterpunkten, abzüglich Erstattungen
const KRANKHEIT_FELDER = ['arzt', 'zahn', 'zuzahlungen', 'hilfsmittel', 'therapie', 'kur', 'fahrten', 'pflegeAmbulant', 'umbau'];
function krankheitskosten(k = {}) {
  const summe = KRANKHEIT_FELDER.reduce((a, f) => a + pos(k[f]), 0);
  return Math.max(0, summe - pos(k.erstattung));
}

function vorsorgeabzug(person, p = P2025) {
  const basis = pos(person.kvpv);
  const sonst = pos(person.sonstigeVorsorge);
  return Math.max(basis, Math.min(basis + sonst, p.vorsorgeHoechst));
}

// Hauptfunktion
// eingabe = { verheiratet, kirchensteuer (0 | 0.08 | 0.09), personen: [..], kapital: { ertraege, einbehalten } }
function berechne(eingabe, p = P2025) {
  const splitting = !!eingabe.verheiratet;
  const personen = splitting ? eingabe.personen.slice(0, 2) : eingabe.personen.slice(0, 1);
  const anzahl = personen.length;
  const kiSatz = Number(eingabe.kirchensteuer) || 0;

  const pers = personen.map(pp => ({ eingabe: pp, ...einkuenftePerson(pp, p), vorsorge: vorsorgeabzug(pp, p) }));

  // Kapitalerträge (Zinsen, Dividenden), bei Paaren gemeinsam
  const kapErtraege = pos(eingabe.kapital?.ertraege);
  const kapPausch = Math.min(kapErtraege, p.sparerPausch * anzahl);
  const kapEink = kapErtraege - kapPausch;
  const kapEinbehalten = pos(eingabe.kapital?.einbehalten);

  const a = eingabe.ausgaben || {};
  const sonderPausch = p.sonderausgabenPausch * anzahl;
  const vorsorge = pers.reduce((s, x) => s + x.vorsorge, 0);

  // Parteispenden: bis 1.650 € je Person halbiert von der Steuer, der Rest bis gleicher Höhe als Sonderausgabe
  const partei = pos(a.parteispenden);
  const partei34g = Math.min(partei, p.parteiHoechst * anzahl);
  const parteiSonder = Math.min(partei - partei34g, p.parteiHoechst * anzahl);
  const kistNetto = Math.max(0, pos(a.kirchensteuerGezahlt) - pos(a.kirchensteuerErstattet));

  // Außergewöhnliche Belastungen mit zumutbarer Belastung
  const krank = krankheitskosten(a.krankheit);
  const heimBrutto = pos(a.krankheit?.pflegeheim);
  const heimMonate = Math.min(12, Math.max(0, Number(a.krankheit?.heimMonate) || 12));
  const haushaltsersparnis = a.krankheit?.haushaltAufgeloest && heimBrutto > 0 ? Math.round(p.haushaltsersparnis * heimMonate / 12) : 0;
  const heim = Math.max(0, heimBrutto - haushaltsersparnis);
  const bestattung = pos(a.bestattung);
  const fahrtPausch = pers.reduce((s, x) => s + fahrtkostenPauschale(x.eingabe, p), 0);
  const agBSumme = krank + heim + bestattung + fahrtPausch;
  const behinderung = pers.reduce((s, x) => s + behindertenPauschbetrag(x.eingabe, p), 0);
  const pflege = pers.reduce((s, x) => s + pflegePauschbetrag(x.eingabe, p), 0);

  function rechne(mitKapital) {
    const kapJePerson = mitKapital ? kapEink / anzahl : 0;
    let summeEink = 0, ae = 0;
    pers.forEach(x => {
      summeEink += x.summe + kapJePerson;
      ae += altersentlastung(x.eingabe, x.aeBasisOhneKapital + kapJePerson);
    });
    const gesamtbetrag = summeEink - ae;
    const spenden = Math.min(pos(a.spenden), Math.max(0, gesamtbetrag) * p.spendenAnteil);
    const sonderTatsaechlich = spenden + parteiSonder + kistNetto;
    const sonderausgaben = Math.max(sonderPausch, sonderTatsaechlich);
    const zumutbar = zumutbareBelastung(gesamtbetrag, splitting, p);
    const agBAbzug = Math.max(0, agBSumme - zumutbar);
    const zvE = Math.max(0, Math.floor(gesamtbetrag - vorsorge - sonderausgaben - agBAbzug - behinderung - pflege));
    const est = einkommensteuer(zvE, splitting);
    return { summeEink, ae, gesamtbetrag, zvE, est, spenden, sonderausgaben, sonderTatsaechlich, zumutbar, agBAbzug };
  }

  const ohne = rechne(false);
  // Abgeltungsteuer (bei Kirchensteuer ermäßigter Satz nach § 32d Abs. 1)
  const kapESt = kiSatz > 0 ? Math.floor(kapEink / (4 + kiSatz) * 100) / 100 : Math.floor(kapEink * p.abgeltungSatz * 100) / 100;
  const mit = rechne(true);
  const guenstiger = kapEink > 0 && mit.est < ohne.est + kapESt;
  const basis = guenstiger ? mit : ohne;

  const estTarif = basis.est;
  const freigrenze = p.soliFreigrenze * (splitting ? 2 : 1);

  const kap = guenstiger
    ? { est: 0, soli: 0, kist: 0 }
    : { est: kapESt, soli: Math.floor(kapESt * 0.055 * 100) / 100, kist: Math.floor(kapESt * kiSatz * 100) / 100 };

  // Steuerermäßigungen: erst Parteispenden (§ 34g), dann Haushalt und Handwerker (§ 35a)
  const e = p.ermaessigung35a;
  const erm34gVoll = Math.floor(partei34g * 0.5);
  const erm34g = Math.min(estTarif, erm34gVoll);
  const erm35aVoll = {
    haushalt: Math.min(pos(a.haushaltsnah) * e.satz, e.haushalt),
    minijob: Math.min(pos(a.minijob) * e.satz, e.minijob),
    handwerker: Math.min(pos(a.handwerker) * e.satz, e.handwerker),
  };
  const erm35aSumme = Math.floor(erm35aVoll.haushalt + erm35aVoll.minijob + erm35aVoll.handwerker);
  const erm35a = Math.min(estTarif - erm34g, erm35aSumme);
  const ermaessigung = erm34g + erm35a;
  const estNachErm = estTarif - ermaessigung;
  // Soli und Kirchensteuer nach Ermäßigung neu
  const soli = estNachErm > freigrenze ? Math.floor(Math.min(estNachErm * 0.055, (estNachErm - freigrenze) * 0.119) * 100) / 100 : 0;
  const kist = Math.floor(estNachErm * kiSatz * 100) / 100;

  const gesamt = r2(estNachErm + soli + kist + kap.est + kap.soli + kap.kist);
  const einkommenBrutto = pers.reduce((s, x) => s + x.zeilen.filter(z => z.brutto).reduce((a, z) => a + z.brutto, 0), 0)
    + kapErtraege + pers.reduce((s, x) => s + pos(x.eingabe.arbeitslohn), 0);

  return {
    jahr: p.jahr, splitting, personen: pers,
    kapital: { ertraege: kapErtraege, pauschbetrag: kapPausch, einkuenfte: kapEink, abgeltung: kapESt, guenstiger, einbehalten: kapEinbehalten,
      ersparnisGuenstiger: guenstiger ? r2(ohne.est + kapESt - mit.est) : 0 },
    summeEinkuenfte: basis.summeEink, altersentlastung: basis.ae, gesamtbetrag: basis.gesamtbetrag,
    vorsorge, sonderausgaben: basis.sonderausgaben, sonderPausch,
    sonder: { spenden: basis.spenden, spendenEingabe: pos(a.spenden), parteiSonder, kirchensteuer: kistNetto, tatsaechlich: basis.sonderTatsaechlich },
    agB: { krankheit: krank, heim, haushaltsersparnis, bestattung, fahrtPausch, summe: agBSumme, zumutbar: basis.zumutbar, abzug: basis.agBAbzug },
    behinderung, pflege,
    erm: { partei: erm34g, parteiVoll: erm34gVoll, haushalt35a: erm35a, haushalt35aVoll: erm35aSumme, einzeln: erm35aVoll },
    zvE: basis.zvE, estTarif, ermaessigung, est: estNachErm, soli, kist,
    kapSteuer: kap, gesamt, einkommenBrutto,
    monatlich: r2(gesamt / 12),
    durchschnittssatz: einkommenBrutto > 0 ? gesamt / einkommenBrutto : 0,
    vorauszahlungen: pos(eingabe.vorauszahlungen),
    // positiv = Nachzahlung, negativ = Erstattung
    saldo: r2(gesamt - pos(eingabe.vorauszahlungen) - kapEinbehalten),
  };
}

if (typeof module !== 'undefined') module.exports = { zumutbareBelastung, behindertenPauschbetrag, fahrtkostenPauschale, krankheitskosten, P2025, tarif2025, einkommensteuer, besteuerungsanteil, versorgungsfreibetragWerte, altersentlastungWerte, schaetzeKvPv, berechne };
