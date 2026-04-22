import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NbIconModule, NbActionsModule } from '@nebular/theme';
import { PermissionService } from '../../../core/services/permission.service';

interface SearchResultItem {
  label: string;
  description: string;
  route: string;
  keywords: string[];
  module?: string;
  action?: 'READ' | 'CREATE' | 'EXECUTE' | 'ANY';
  requiresAdmin?: boolean;
}

@Component({
  selector: 'ngx-header',
  styleUrls: ['./header.component.scss'],
  templateUrl: './header.component.html',
  standalone: true,
  imports: [
    CommonModule,
    NbIconModule,
    NbActionsModule,
  ],
})
export class HeaderComponent {
  searchQuery = '';
  searchFocused = false;
  readonly searchItems: SearchResultItem[] = [
    {
      label: 'Dashboard Production',
      description: 'Vue générale des indicateurs de production',
      route: '/pages/dashboard/production',
      keywords: ['dashboard production'],
      module: 'DASHBOARD',
      action: 'READ',
    },
    {
      label: 'Dashboard Admin',
      description: 'Supervision et gestion administrative',
      route: '/pages/dashboard/admin',
      keywords: ['dashboard admin'],
      module: 'DASHBOARD_ADMIN',
      action: 'READ',
      requiresAdmin: true,
    },
    {
      label: 'Réception - Consulter',
      description: 'Consulter l historique des réceptions',
      route: '/pages/reception/consulter',
      keywords: ['reception', 'réception', 'consulter'],
      module: 'RECEPTION',
      action: 'READ',
    },
    {
      label: 'Réception - Gérer',
      description: 'Créer et gérer les arrivages de lots',
      route: '/pages/reception/gerer',
      keywords: ['reception', 'réception', 'gérer', 'arrivage'],
      module: 'RECEPTION',
      action: 'CREATE',
    },
    {
      label: 'Lots mouvement - Consulter',
      description: 'Consulter l historique des mouvements de lots',
      route: '/pages/lots/movements/history',
      keywords: ['lots', 'mouvement', 'consulter', 'historique'],
      module: 'STOCK_MOUVEMENT',
      action: 'READ',
    },
    {
      label: 'Lots mouvement - Gérer',
      description: 'Créer ou modifier un mouvement de lots',
      route: '/pages/lots/movements/create',
      keywords: ['lots', 'mouvement', 'gérer', 'formulaire', 'créer'],
      module: 'STOCK_MOUVEMENT',
      action: 'CREATE',
    },
    {
      label: 'Guide de Production - Consulter',
      description: 'Consulter les guides de production',
      route: '/pages/production/guides/consulter',
      keywords: ['guide de production', 'consulter', 'production'],
      module: 'GUIDE_PRODUCTION',
      action: 'READ',
    },
    {
      label: 'Guide de Production - Exécuter',
      description: 'Exécuter un guide de production',
      route: '/pages/production/guides/executer',
      keywords: ['guide de production', 'executer', 'exécuter', 'production'],
      module: 'GUIDE_PRODUCTION',
      action: 'EXECUTE',
    },
    {
      label: 'Guide de Production - Gérer',
      description: 'Créer et gérer les guides de production',
      route: '/pages/production/guides/gerer',
      keywords: ['guide de production', 'gérer', 'production'],
      module: 'GUIDE_PRODUCTION',
      action: 'CREATE',
    },
    {
      label: 'Machines - Consulter',
      description: 'Consulter le parc machines',
      route: '/pages/machines',
      keywords: ['machine', 'machines', 'consulter'],
      module: 'MACHINES',
      action: 'READ',
    },
    {
      label: 'Machines - Gérer',
      description: 'Gérer le parc machines',
      route: '/pages/machines/management',
      keywords: ['machine', 'machines', 'gérer', 'management'],
      module: 'MACHINES',
      action: 'CREATE',
    },
    {
      label: 'Gestion des Huileries',
      description: 'Administration des huileries et de leurs paramètres',
      route: '/pages/huileries/management',
      keywords: ['huilerie', 'huileries'],
      module: 'HUILERIES',
      action: 'READ',
    },
    {
      label: 'Matières Premières - Consulter',
      description: 'Consulter les matières premières',
      route: '/pages/matieres-premieres/consulter',
      keywords: ['matiere premieres', 'matière premières', 'consulter'],
      module: 'MATIERES_PREMIERES',
      action: 'READ',
    },
    {
      label: 'Matières Premières - Gérer',
      description: 'Créer et gérer les matières premières',
      route: '/pages/matieres-premieres/gerer',
      keywords: ['matiere premieres', 'matière premières', 'gérer'],
      module: 'MATIERES_PREMIERES',
      action: 'CREATE',
    },
    {
      label: 'Stock',
      description: 'Vue consolidée du stock',
      route: '/pages/stock',
      keywords: ['stock'],
      module: 'STOCK',
      action: 'READ',
    },
    {
      label: 'Traçabilité des Lots',
      description: 'Recherche et suivi de l’historique des lots',
      route: '/pages/lots/traceability',
      keywords: ['lots', 'traçabilité'],
      module: 'LOTS_TRAÇABILITE',
      action: 'READ',
    },
    {
      label: 'Campagnes Olives - Consulter',
      description: 'Consulter les campagnes d olives',
      route: '/pages/campagnes/consulter',
      keywords: ['campagnes', 'olives', 'consulter'],
      module: 'CAMPAGNE_OLIVES',
      action: 'READ',
    },
    {
      label: 'Campagnes Olives - Gérer',
      description: 'Créer et gérer les campagnes d olives',
      route: '/pages/campagnes/gerer',
      keywords: ['campagnes', 'olives', 'gérer'],
      module: 'CAMPAGNE_OLIVES',
      action: 'CREATE',
    },
    {
      label: 'Gestion Profils & Permissions',
      description: 'Administration des profils et permissions',
      route: '/admin/profils',
      keywords: ['profil', 'permissions', 'acces', 'admin'],
      module: 'COMPTES_PROFILS',
      action: 'ANY',
      requiresAdmin: true,
    },
    {
      label: 'Gestion Utilisateurs',
      description: 'Administration des utilisateurs',
      route: '/admin/utilisateurs',
      keywords: ['utilisateur', 'utilisateurs', 'admin'],
      module: 'UTILISATEURS',
      action: 'ANY',
      requiresAdmin: true,
    },
    {
      label: 'Profil utilisateur',
      description: 'Informations du compte connecté',
      route: '/pages/mon-profil',
      keywords: ['compte', 'information'],
    },
  ];
  constructor(
    private router: Router,
    private permissionService: PermissionService,
  ) { }

  get filteredSearchItems(): SearchResultItem[] {
    if (this.isSearchLocked) {
      return [];
    }

    const query = this.searchQuery.trim().toLowerCase();

    if (!query) {
      return [];
    }

    return this.searchItems
      .filter((item) => this.canAccessSearchItem(item))
      .filter((item) => {
        const haystack = [item.label, item.description, ...item.keywords].join(' ').toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 6);
  }

  get isSearchLocked(): boolean {
    if (this.permissionService.isAdmin()) {
      return false;
    }

    const modules = [
      'DASHBOARD',
      'RECEPTION',
      'GUIDE_PRODUCTION',
      'MACHINES',
      'MATIERES_PREMIERES',
      'STOCK',
      'STOCK_MOUVEMENT',
      'LOTS_TRAÇABILITE',
      'HUILERIES',
      'DASHBOARD_ADMIN',
      'COMPTES_PROFILS',
      'UTILISATEURS',
    ];

    return !modules.some((moduleName) => this.permissionService.hasAnyPermission(moduleName));
  }

  private canAccessSearchItem(item: SearchResultItem): boolean {
    if (item.requiresAdmin && !this.permissionService.isAdmin()) {
      return false;
    }

    if (!item.module) {
      return true;
    }

    if (this.permissionService.isAdmin()) {
      return true;
    }

    const action = item.action ?? 'READ';
    if (action === 'READ') {
      return this.permissionService.canRead(item.module);
    }

    if (action === 'CREATE') {
      return this.permissionService.canCreate(item.module);
    }

    if (action === 'EXECUTE') {
      return this.permissionService.canExecute(item.module);
    }

    return this.permissionService.hasAnyPermission(item.module);
  }

  onSearchFocus(): void {
    this.searchFocused = true;
  }

  onSearchBlur(): void {
    window.setTimeout(() => {
      this.searchFocused = false;
    }, 150);
  }

  clearSearch(): void {
    if (this.isSearchLocked) {
      return;
    }

    this.searchQuery = '';
  }

  openSearchResult(item: SearchResultItem): void {
    if (this.isSearchLocked) {
      return;
    }

    this.searchQuery = item.label;
    this.searchFocused = false;
    void this.router.navigate([item.route]);
  }

  onSearchEnter(): void {
    if (this.isSearchLocked) {
      return;
    }

    const [firstResult] = this.filteredSearchItems;

    if (firstResult) {
      this.openSearchResult(firstResult);
    }
  }

  goToProfile(): void {
    void this.router.navigate(['/pages/mon-profil']);
  }
}
