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
        title: 'Consulter',
        icon: 'list-outline',
        link: '/pages/reception/consulter',
      },
      {
        title: 'Gérer',
        icon: 'settings-outline',
        link: '/pages/reception/gerer',
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
        title: 'Exécuter',
        icon: 'play-circle-outline',
        link: '/pages/production/guides/executer',
      },
      {
        title: 'Gérer',
        icon: 'settings-outline',
        link: '/pages/production/guides/gerer',
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
        title: 'Consulter',
        icon: 'list-outline',
        link: '/pages/matieres-premieres/consulter',
      },
      {
        title: 'Gérer',
        icon: 'settings-outline',
        link: '/pages/matieres-premieres/gerer',
      },
    ],
  },
  {
    title: 'Stock',
    icon: 'cube-outline',
    link: '/pages/stock',
  },
  {
    title: 'Stock mouvement',
    icon: 'swap-outline',
    children: [
      {
        title: 'Consulter',
        icon: 'list-outline',
        link: '/pages/stock/history',
      },
      {
        title: 'Gérer',
        icon: 'settings-outline',
        link: '/pages/stock/form',
      },
    ],
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
    title: 'Huileries',
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
