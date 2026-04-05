import { NbMenuItem } from '@nebular/theme';

export const MENU_ITEMS: NbMenuItem[] = [
  {
    title: 'Responsable Production',
    group: true,
  },
  {
    title: 'Dashboard',
    icon: 'activity-outline',
    link: '/pages/dashboard/production',
    home: true,
  },
  {
    title: 'Réception',
    icon: 'cube-outline',
    link: '/pages/reception',
  },
  {
    title: 'Guide de Production',
    icon: 'options-2-outline',
    link: '/pages/production/guides',
  },
  {
    title: 'Machines',
    icon: 'hard-drive-outline',
    link: '/pages/machines',
  },
  {
    title: 'Matières Premières',
    icon: 'archive-outline',
    link: '/pages/matieres-premieres',
  },
  {
    title: 'Stock',
    icon: 'cube-outline',
    link: '/pages/stock',
  },
  {
    title: 'Traçabilité des Lots',
    icon: 'pricetags-outline',
    link: '/pages/lots/traceability',
  },
  {
    title: 'Administrateur',
    group: true,
  },
  {
    title: 'Dashboard Admin',
    icon: 'settings-2-outline',
    link: '/pages/dashboard/admin',
  },
  {
    title: 'Gestion des Huileries',
    icon: 'home-outline',
    link: '/pages/machines/management',
  },
  {
    title: 'Gestion Acces',
    icon: 'people-outline',
    link: '/admin/profils',
  },
  {
    title: 'Affectation Utilisateurs',
    icon: 'person-done-outline',
    link: '/admin/utilisateurs',
  },
];
