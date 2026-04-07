import { NbMenuItem } from '@nebular/theme';

export const MENU_ITEMS: NbMenuItem[] = [
  
  {
    title: 'Dashboard',
    icon: 'activity-outline',
    link: '/pages/dashboard/production',
    home: true,
  },
  {
    title: 'Réception',
    icon: 'cube-outline',
    children: [
      {
        title: 'Gérer',
        icon: 'plus-circle-outline',
        link: '/pages/reception/new',
      },
      {
        title: 'Consulter',
        icon: 'list-outline',
        link: '/pages/reception',
      },
    ],
  },
  {
    title: 'Guide de Production',
    icon: 'options-2-outline',
    children: [
      {
        title: 'Consulter',
        icon: 'list-outline',
        link: '/pages/production/guides/consulter',
      },
      {
        title: 'Gérer',
        icon: 'plus-circle-outline',
        link: '/pages/production/guides/creer',
      },
      {
        title: 'Exécuter',
        icon: 'play-circle-outline',
        link: '/pages/production/guides/executer',
      },
    ],
  },
  {
    title: 'Machines',
    icon: 'hard-drive-outline',
    children: [
      {
        title: 'Consulter',
        icon: 'list-outline',
        link: '/pages/machines',
      },
      {
        title: 'Gérer',
        icon: 'settings-outline',
        link: '/pages/machines/management',
      },
    ],
  },
  {
    title: 'Matières Premières',
    icon: 'archive-outline',
    children: [
      {
        title: 'Créer',
        icon: 'plus-circle-outline',
        link: '/pages/matieres-premieres/creer',
      },
      {
        title: 'Consulter',
        icon: 'list-outline',
        link: '/pages/matieres-premieres/consulter',
      },
    ],
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
    title: 'Dashboard Admin',
    icon: 'settings-2-outline',
    link: '/pages/dashboard/admin',
  },
  {
    title: 'Gestion des Huileries',
    icon: 'home-outline',
    link: '/pages/huileries/management',
  },
  {
    title: 'Gestion Paramétrage',
    icon: 'settings-2-outline',
    children: [
      {
        title: 'Gestion Profils & Permissions',
        icon: 'settings-outline',
        link: '/admin/profils',
      },
      {
        title: 'Gestion Utilisateurs',
        icon: 'person-done-outline',
        link: '/admin/utilisateurs',
      },
    ],
  },
];
