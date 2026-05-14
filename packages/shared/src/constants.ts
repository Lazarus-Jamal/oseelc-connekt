export const APP_NAME = 'Oseelc-connekt'
export const APP_VERSION = '1.0.0'

export const PAGINATION_DEFAULT_LIMIT = 20
export const PAGINATION_MAX_LIMIT = 100

export const UPLOAD_MAX_SIZE_MB = 10
export const UPLOAD_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]

export const ROLES_LABELS: Record<string, string> = {
  SUPER_ADMIN:       'Administrateur Système',
  DATA_ADMIN:        'Admin Data (National)',
  DIRECTION:         'Direction',
  REGIONAL_DIRECTOR: 'Directeur Régional',
  FACILITY_CHIEF:    'Chef de Centre',
  FINANCIER:         'Financier',
  DATA_MANAGER:      'Responsable Data',
  CONTROLEUR:          'Contrôleur Général',
  CONTROLEUR_REGIONAL: 'Contrôleur Régional',
  CAISSIER:            'Caissier',
}

export const FACILITY_TYPE_LABELS: Record<string, string> = {
  HOSPITAL: 'Hôpital',
  HEALTH_CENTER: 'Centre de Santé',
}

export const DECLARATION_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumis',
  REVIEWED: 'Examiné',
  VALIDATED: 'Validé',
  REJECTED: 'Rejeté',
}

export const DECLARATION_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'gray',
  SUBMITTED: 'blue',
  REVIEWED: 'orange',
  VALIDATED: 'green',
  REJECTED: 'red',
}

export const PERIOD_TYPE_LABELS: Record<string, string> = {
  DAILY: 'Journalier',
  WEEKLY: 'Hebdomadaire',
  MONTHLY: 'Mensuel',
}

export const STAT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumis',
  VALIDATED: 'Validé',
  REJECTED: 'Rejeté',
}

export const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

export const EXPENSE_CATEGORIES = [
  'Personnel',
  'Médicaments et consommables',
  'Équipements et matériels',
  'Entretien et maintenance',
  'Eau, électricité, téléphone',
  'Transport et carburant',
  'Frais administratifs',
  'Formations et séminaires',
  'Autres dépenses',
]

export const DECLARATION_TYPE_LABELS: Record<string, string> = {
  REVENUE: 'Recettes',
  EXPENSE: 'Dépenses',
}
