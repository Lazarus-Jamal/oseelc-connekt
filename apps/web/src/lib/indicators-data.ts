export interface IndicatorSeed {
  code: string
  label: string
  category: string
  unit?: string
  isRequired: boolean
  description?: string
  sortOrder: number
}

// ── Libellés MINSANTE/DHIS2 ────────────────────────────────────────────────
const A1 = '< 5 ans'
const A2 = '5-14 ans'
const A3 = '15-24 ans'
const A4 = '25-49 ans'
const A5 = '50+ ans'

// Génère 10 entrées age×sex pour une catégorie (grille MINSANTE)
function ageSex(prefix: string, row: string, cat: string, unit: string, required: boolean, base: number): IndicatorSeed[] {
  const ages: [string, string][] = [['M5', A1], ['5_14', A2], ['15_24', A3], ['25_49', A4], ['50P', A5]]
  return ages.flatMap(([code, label], ai) => [
    { code: `${prefix}_${code}_M`, label: `${row} · ${label} · Masculin`, category: cat, unit, isRequired: required, sortOrder: base + ai * 2 },
    { code: `${prefix}_${code}_F`, label: `${row} · ${label} · Féminin`,  category: cat, unit, isRequired: required, sortOrder: base + ai * 2 + 1 },
  ])
}

// Génère 5 entrées age-only pour une catégorie (grille MINSANTE)
function ageOnly(prefix: string, row: string, cat: string, unit: string, required: boolean, base: number): IndicatorSeed[] {
  return [
    { code: `${prefix}_M5`,    label: `${row} · ${A1}`, category: cat, unit, isRequired: required, sortOrder: base },
    { code: `${prefix}_5_14`,  label: `${row} · ${A2}`, category: cat, unit, isRequired: required, sortOrder: base + 1 },
    { code: `${prefix}_15_24`, label: `${row} · ${A3}`, category: cat, unit, isRequired: required, sortOrder: base + 2 },
    { code: `${prefix}_25_49`, label: `${row} · ${A4}`, category: cat, unit, isRequired: required, sortOrder: base + 3 },
    { code: `${prefix}_50P`,   label: `${row} · ${A5}`, category: cat, unit, isRequired: required, sortOrder: base + 4 },
  ]
}

export const INDICATORS_DATA: IndicatorSeed[] = [

  // ── CONSULTATIONS (age × sexe — MINSANTE DHIS2) ───────────────────────────
  ...ageSex('CONS', 'Consultations', 'Consultations', 'cas', true, 1),

  // ── HOSPITALISATIONS (age × sexe par service — MINSANTE) ────────────────────
  ...ageSex('HOSP_MED',  'Médecine',    'Hospitalisations', 'cas', true, 1),
  ...ageSex('HOSP_PED',  'Pédiatrie',   'Hospitalisations', 'cas', true, 11),
  ...ageSex('HOSP_CHI',  'Chirurgie',   'Hospitalisations', 'cas', true, 21),
  ...ageSex('HOSP_MAT',  'Maternité',   'Hospitalisations', 'cas', true, 31),
  ...ageSex('HOSP_REA',  'Réanimation', 'Hospitalisations', 'cas', true, 41),

  // ── BLOC OPÉRATOIRE (age × sexe — MINSANTE) ──────────────────────────────
  ...ageSex('BLOC_MAJ', 'Chirurgies majeures', 'Bloc opératoire', 'interventions', true, 1),
  ...ageSex('BLOC_MIN', 'Chirurgies mineures', 'Bloc opératoire', 'interventions', true, 11),

  // ── SERVICES SPÉCIALISÉS (age × sexe — MINSANTE) ─────────────────────────
  ...ageSex('SPEC_DENT',  'Dentisterie',    'Services spécialisés', 'cas', false, 1),
  ...ageSex('SPEC_OPHT',  'Ophtalmologie',  'Services spécialisés', 'cas', false, 11),
  ...ageSex('SPEC_PHYSIO','Physiothérapie', 'Services spécialisés', 'cas', false, 21),
  ...ageSex('SPEC_NUTR',  'Nutrition',      'Services spécialisés', 'cas', false, 31),
  ...ageSex('SPEC_MENT',  'Santé mentale',  'Services spécialisés', 'cas', false, 41),

  // ── IMAGERIE MÉDICALE (age × sexe — MINSANTE) ────────────────────────────
  ...ageSex('IMG_RADIO', 'Radiologie',   'Imagerie médicale', 'examens', false, 1),
  ...ageSex('IMG_ECHO',  'Échographie',  'Imagerie médicale', 'examens', false, 11),
  ...ageSex('IMG_ECG',   'ECG',          'Imagerie médicale', 'examens', false, 21),

  // ── LABORATOIRE (age × sexe — MINSANTE) ──────────────────────────────────
  ...ageSex('LAB_PARA', 'Parasitologie', 'Laboratoire', 'analyses', false, 1),
  ...ageSex('LAB_BACT', 'Bactériologie', 'Laboratoire', 'analyses', false, 11),
  ...ageSex('LAB_SERO', 'Sérologie',     'Laboratoire', 'analyses', false, 21),
  ...ageSex('LAB_HEMA', 'Hématologie',   'Laboratoire', 'analyses', false, 31),
  ...ageSex('LAB_BIO',  'Biochimie',     'Laboratoire', 'analyses', false, 41),

  // ── PROGRAMMES DE SANTÉ (plat) ────────────────────────────────────────────
  { code: 'PGM_PEV',       label: 'PEV – Enfants vaccinés',              category: 'Programmes de santé', unit: 'enfants',       isRequired: true,  sortOrder: 1 },
  { code: 'PGM_CPN',       label: 'CPN – Femmes suivies',                category: 'Programmes de santé', unit: 'femmes',        isRequired: true,  sortOrder: 2 },
  { code: 'PGM_ACCOU',     label: 'Accouchements',                       category: 'Programmes de santé', unit: 'naissances',    isRequired: true,  sortOrder: 3 },
  { code: 'PGM_CESAR',     label: 'Césariennes',                         category: 'Programmes de santé', unit: 'interventions', isRequired: true,  sortOrder: 4 },
  { code: 'PGM_UPEC',      label: 'UPEC – File active VIH',              category: 'Programmes de santé', unit: 'patients',      isRequired: true,  sortOrder: 5 },
  { code: 'PGM_PTME',      label: 'PTME – Femmes enceintes testées VIH', category: 'Programmes de santé', unit: 'femmes',        isRequired: true,  sortOrder: 6 },
  { code: 'PGM_CDT',       label: 'CDT – Cas tuberculose',               category: 'Programmes de santé', unit: 'cas',           isRequired: true,  sortOrder: 7 },
  { code: 'PGM_DECES_MAT', label: 'Décès maternels',                     category: 'Programmes de santé', unit: 'décès',         isRequired: true,  sortOrder: 8 },

  // ── MALADIES NOTIFIABLES (age × sexe — MINSANTE) ─────────────────────────
  ...ageSex('MAL_PALU',  'Paludisme',         'Maladies notifiables', 'cas', true, 1),
  ...ageSex('MAL_TB',    'Tuberculose',        'Maladies notifiables', 'cas', true, 11),
  ...ageSex('MAL_TN',    'Tétanos néonatal',   'Maladies notifiables', 'cas', true, 21),
  ...ageSex('MAL_LEPRE', 'Lèpre',              'Maladies notifiables', 'cas', true, 31),
  ...ageSex('MAL_FJ',    'Fièvre jaune',        'Maladies notifiables', 'cas', true, 41),
  ...ageSex('MAL_MENIN', 'Méningite (CSM)',     'Maladies notifiables', 'cas', true, 51),
  ...ageSex('MAL_RAGE',  'Rage humaine',        'Maladies notifiables', 'cas', true, 61),
  ...ageSex('MAL_CHOL',  'Choléra',             'Maladies notifiables', 'cas', true, 71),
  ...ageSex('MAL_FT',    'Fièvre typhoïde',     'Maladies notifiables', 'cas', true, 81),
  ...ageSex('MAL_POLIO', 'Poliomyélite',        'Maladies notifiables', 'cas', true, 91),
  ...ageSex('MAL_ROUG',  'Rougeole',            'Maladies notifiables', 'cas', true, 101),
  ...ageSex('MAL_COVID', 'COVID-19',            'Maladies notifiables', 'cas', true, 111),

  // ── MORBIDITÉ & MORTALITÉ (age × sexe — MINSANTE) ───────────────────────
  ...ageSex('MORB_DECES_H', 'Décès hospitaliers', 'Morbidité & mortalité', 'décès', true, 1),

  // ── RESSOURCES HUMAINES (sex-only — inchangé) ─────────────────────────────
  { code: 'RH_SPEC_M',    label: 'Spécialistes · Masculin',              category: 'Ressources humaines', unit: 'agents', isRequired: true,  sortOrder: 1 },
  { code: 'RH_SPEC_F',    label: 'Spécialistes · Féminin',               category: 'Ressources humaines', unit: 'agents', isRequired: true,  sortOrder: 2 },
  { code: 'RH_MED_M',     label: 'Médecins · Masculin',                  category: 'Ressources humaines', unit: 'agents', isRequired: true,  sortOrder: 3 },
  { code: 'RH_MED_F',     label: 'Médecins · Féminin',                   category: 'Ressources humaines', unit: 'agents', isRequired: true,  sortOrder: 4 },
  { code: 'RH_INF_M',     label: 'Infirmiers · Masculin',                category: 'Ressources humaines', unit: 'agents', isRequired: true,  sortOrder: 5 },
  { code: 'RH_INF_F',     label: 'Infirmiers · Féminin',                 category: 'Ressources humaines', unit: 'agents', isRequired: true,  sortOrder: 6 },
  { code: 'RH_SF_M',      label: 'Sage femme (Maïeuticien) · Masculin',  category: 'Ressources humaines', unit: 'agents', isRequired: true,  sortOrder: 7 },
  { code: 'RH_SF_F',      label: 'Sage femme (Maïeuticien) · Féminin',   category: 'Ressources humaines', unit: 'agents', isRequired: true,  sortOrder: 8 },
  { code: 'RH_INFSPEC_M', label: 'Infirmiers spécialisés · Masculin',    category: 'Ressources humaines', unit: 'agents', isRequired: true,  sortOrder: 9 },
  { code: 'RH_INFSPEC_F', label: 'Infirmiers spécialisés · Féminin',     category: 'Ressources humaines', unit: 'agents', isRequired: true,  sortOrder: 10 },
  { code: 'RH_LAB_M',     label: 'Laboratoire · Masculin',               category: 'Ressources humaines', unit: 'agents', isRequired: true,  sortOrder: 11 },
  { code: 'RH_LAB_F',     label: 'Laboratoire · Féminin',                category: 'Ressources humaines', unit: 'agents', isRequired: true,  sortOrder: 12 },
  { code: 'RH_IMG_M',     label: 'Imagerie · Masculin',                  category: 'Ressources humaines', unit: 'agents', isRequired: true,  sortOrder: 13 },
  { code: 'RH_IMG_F',     label: 'Imagerie · Féminin',                   category: 'Ressources humaines', unit: 'agents', isRequired: true,  sortOrder: 14 },
  { code: 'RH_PHAR_M',    label: 'Pharmacie · Masculin',                 category: 'Ressources humaines', unit: 'agents', isRequired: true,  sortOrder: 15 },
  { code: 'RH_PHAR_F',    label: 'Pharmacie · Féminin',                  category: 'Ressources humaines', unit: 'agents', isRequired: true,  sortOrder: 16 },
  { code: 'RH_ADM_M',     label: 'Administration · Masculin',            category: 'Ressources humaines', unit: 'agents', isRequired: true,  sortOrder: 17 },
  { code: 'RH_ADM_F',     label: 'Administration · Féminin',             category: 'Ressources humaines', unit: 'agents', isRequired: true,  sortOrder: 18 },
  { code: 'RH_AUT_M',     label: 'Autres · Masculin',                    category: 'Ressources humaines', unit: 'agents', isRequired: false, sortOrder: 19 },
  { code: 'RH_AUT_F',     label: 'Autres · Féminin',                     category: 'Ressources humaines', unit: 'agents', isRequired: false, sortOrder: 20 },

  // ── ACTIVITÉS SOCIALES (plat — inchangé) ──────────────────────────────────
  { code: 'SOC_REUN',   label: 'Nombre de réunions de direction',           category: 'Activités sociales', unit: 'réunions',  isRequired: false, sortOrder: 1 },
  { code: 'SOC_FORM',   label: 'Nombre de formations continues',            category: 'Activités sociales', unit: 'séances',   isRequired: false, sortOrder: 2 },
  { code: 'SOC_CULT',   label: 'Nombre de cultes / Assistance spirituelle', category: 'Activités sociales', unit: 'cultes',    isRequired: false, sortOrder: 3 },
  { code: 'SOC_RONDE',  label: 'Nombre de rondes auprès des patients',      category: 'Activités sociales', unit: 'rondes',    isRequired: false, sortOrder: 4 },
  { code: 'SOC_SENSI',  label: 'Séances de sensibilisation communautaire',  category: 'Activités sociales', unit: 'séances',   isRequired: false, sortOrder: 5 },
  { code: 'SOC_VISITE', label: 'Visites pastorales / à domicile',           category: 'Activités sociales', unit: 'visites',   isRequired: false, sortOrder: 6 },
  { code: 'SOC_BENEF',  label: 'Nombre de bénéficiaires des activités',     category: 'Activités sociales', unit: 'personnes', isRequired: false, sortOrder: 7 },
]
