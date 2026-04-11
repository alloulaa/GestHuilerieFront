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
    },
    {
      label: 'Dashboard Admin',
      description: 'Supervision et gestion administrative',
      route: '/pages/dashboard/admin',
      keywords: ['dashboard admin'],
      module: 'DASHBOARD_ADMIN',
    },
    {
      label: 'Réception',
      description: 'Saisie et suivi des lots réceptionnés',
      route: '/pages/reception',
      keywords: ['reception', 'réception'],
      module: 'RECEPTION',
    },
    {
      label: 'Guide de Production',
      description: 'Paramétrage des guides et étapes de production',
      route: '/pages/production/guides',
      keywords: ['guide de production'],
      module: 'GUIDE_PRODUCTION',
    },
    {
      label: 'Machines',
      description: 'Liste et gestion du parc machines',
      route: '/pages/machines',
      keywords: ['machine', 'machines'],
      module: 'MACHINES',
    },
    {
      label: 'Gestion des Huileries',
      description: 'Administration des huileries et de leurs paramètres',
      route: '/pages/machines/management',
      keywords: ['huilerie', 'huileries'],
      module: 'HUILERIES',
    },
    {
      label: 'Matières Premières',
      description: 'Référentiel des matières utilisées',
      route: '/pages/matieres-premieres',
      keywords: ['matiere premieres', 'matière premières'],
      module: 'MATIERES_PREMIERES',
    },
    {
      label: 'Stock',
      description: 'Suivi des stocks et mouvements',
      route: '/pages/stock',
      keywords: ['stock'],
      module: 'STOCK',
    },
    {
      label: 'Traçabilité des Lots',
      description: 'Recherche et suivi de l’historique des lots',
      route: '/pages/lots/traceability',
      keywords: ['lots', 'traçabilité'],
      module: 'LOTS_TRAÇABILITE',
    },
    {
      label: 'Gestion Acces',
      description: 'Profils, permissions et droits d’accès',
      route: '/admin/profils',
      keywords: ['profil', 'permissions', 'acces'],
      module: 'COMPTES_PROFILS',
    },
    {
      label: 'Affectation Utilisateurs',
      description: 'Gestion des utilisateurs et de leurs affectations',
      route: '/admin/utilisateurs',
      keywords: ['utilisateur', 'affectation'],
      module: 'UTILISATEURS',
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
      .filter((item) => !item.module || this.permissionService.isAdmin() || this.permissionService.hasAnyPermission(item.module))
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
