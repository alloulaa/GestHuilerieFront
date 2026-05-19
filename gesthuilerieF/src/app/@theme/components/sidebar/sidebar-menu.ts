import { NbMenuItem } from '@nebular/theme';

export const MENU_ITEMS: NbMenuItem[] = [

  {
    title: 'Dashboard',
    icon: 'bar-chart-2-outline',
    link: '/pages/dashboard/production',
    home: true,
  },
  {
    title: 'Réception',
    icon: 'inbox-outline',
    children: [
      {
        title: 'Consulter',
        icon: 'eye-outline',
        link: '/pages/reception/consulter',
      },
      {
        title: 'Gérer',
        icon: 'edit-2-outline',
        link: '/pages/reception/gerer',
      },
    ],
  },
  {
    title: 'Lots mouvement',
    icon: 'shuffle-2-outline',
    children: [
      {
        title: 'Consulter',
        icon: 'eye-outline',
        link: '/pages/lots/movements/consulter',
      },
      {
        title: 'Gérer',
        icon: 'edit-2-outline',
        link: '/pages/lots/movements/gerer',
      },
    ],
  },
  {
    title: 'Guide de Production',
    icon: 'book-open-outline',
    children: [
      {
        title: 'Consulter',
        icon: 'eye-outline',
        link: '/pages/production/guides/consulter',
      },
      {
        title: 'Exécuter',
        icon: 'play-circle-outline',
        link: '/pages/production/guides/executer',
      },
      {
        title: 'Gérer',
        icon: 'edit-2-outline',
        link: '/pages/production/guides/gerer',
      },
    ],
  },
  {
    title: 'Machines',
    icon: 'settings-2-outline',
    children: [
      {
        title: 'Consulter',
        icon: 'eye-outline',
        link: '/pages/machines',
      },
      {
        title: 'Gérer',
        icon: 'edit-2-outline',
        link: '/pages/machines/management',
      },
    ],
  },
  {
    title: 'Matières Premières',
    icon: 'layers-outline',
    children: [
      {
        title: 'Consulter',
        icon: 'eye-outline',
        link: '/pages/matieres-premieres/consulter',
      },
      {
        title: 'Gérer',
        icon: 'edit-2-outline',
        link: '/pages/matieres-premieres/gerer',
      },
    ],
  },
  {
    title: 'Stock',
    icon: 'shopping-bag-outline',
    link: '/pages/stock',
  },
  {
    title: 'Traçabilité des Lots',
    icon: 'map-outline',
    link: '/pages/lots/traceability',
  },
  {
    title: 'Campagnes Olives',
    icon: 'calendar-outline',
    children: [
      {
        title: 'Consulter',
        icon: 'eye-outline',
        link: '/pages/campagnes/consulter',
      },
      {
        title: 'Gérer',
        icon: 'edit-2-outline',
        link: '/pages/campagnes/gerer',
      },
    ],
  },
  {
    title: 'Dashboard Admin',
    icon: 'monitor-outline',
    link: '/pages/dashboard/admin',
  },
  {
    title: 'Huileries',
    icon: 'pantone-outline',
    link: '/pages/huileries/management',
  },
  {
    title: 'Gestion Paramétrage',
    icon: 'shield-outline',
    children: [
      {
        title: 'Gestion Profils & Permissions',
        icon: 'lock-outline',
        link: '/admin/profils',
      },
      {
        title: 'Gestion Utilisateurs',
        icon: 'people-outline',
        link: '/admin/utilisateurs',
      },
    ],
  },
];