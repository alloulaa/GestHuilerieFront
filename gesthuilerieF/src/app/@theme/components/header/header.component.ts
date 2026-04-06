import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { NbIconModule, NbActionsModule, NbContextMenuModule, NbMenuService } from '@nebular/theme';
import { Subject, filter, takeUntil } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';

interface SearchResultItem {
  label: string;
  description: string;
  route: string;
  keywords: string[];
}

@Component({
  selector: 'ngx-header',
  styleUrls: ['./header.component.scss'],
  templateUrl: './header.component.html',
  standalone: true,
  imports: [
    NbIconModule,
    NbActionsModule,
    NbContextMenuModule,
  ],
})
export class HeaderComponent {
  searchQuery = '';
  searchFocused = false;
  userMenu = [{ title: 'Profile' }, { title: 'Log out' }];
  readonly searchItems: SearchResultItem[] = [
    {
      label: 'Dashboard Production',
      description: 'Vue générale des indicateurs de production',
      route: '/pages/dashboard/production',
      keywords: ['dashboard production'],
    },
    {
      label: 'Dashboard Admin',
      description: 'Supervision et gestion administrative',
      route: '/pages/dashboard/admin',
      keywords: ['dashboard admin'],
    },
    {
      label: 'Réception',
      description: 'Saisie et suivi des lots réceptionnés',
      route: '/pages/reception',
      keywords: ['reception', 'réception'],
    },
    {
      label: 'Guide de Production',
      description: 'Paramétrage des guides et étapes de production',
      route: '/pages/production/guides',
      keywords: ['guide de production'],
    },
    {
      label: 'Machines',
      description: 'Liste et gestion du parc machines',
      route: '/pages/machines',
      keywords: ['machine', 'machines'],
    },
    {
      label: 'Gestion des Huileries',
      description: 'Administration des huileries et de leurs paramètres',
      route: '/pages/machines/management',
      keywords: ['huilerie', 'huileries'],
    },
    {
      label: 'Matières Premières',
      description: 'Référentiel des matières utilisées',
      route: '/pages/matieres-premieres',
      keywords: ['matiere premieres', 'matière premières'],
    },
    {
      label: 'Stock',
      description: 'Suivi des stocks et mouvements',
      route: '/pages/stock',
      keywords: ['stock'],
    },
    {
      label: 'Traçabilité des Lots',
      description: 'Recherche et suivi de l’historique des lots',
      route: '/pages/lots/traceability',
      keywords: ['lots',  'traçabilité'],
    },
    {
      label: 'Gestion Acces',
      description: 'Profils, permissions et droits d’accès',
      route: '/admin/profils',
      keywords: ['profil', 'permissions', 'acces'],
    },
    {
      label: 'Affectation Utilisateurs',
      description: 'Gestion des utilisateurs et de leurs affectations',
      route: '/admin/utilisateurs',
      keywords: ['utilisateur',  'affectation'],
    },
    {
      label: 'Profil utilisateur',
      description: 'Informations du compte connecté',
      route: '/pages/mon-profil',
      keywords: ['compte', 'information'],
    },
  ];
  private destroy$ = new Subject<void>();

  constructor(
    private menuService: NbMenuService,
    private authService: AuthService,
    private router: Router
  ) {
    this.menuService
      .onItemClick()
      .pipe(
        filter(({ tag }) => tag === 'user-menu'),
        takeUntil(this.destroy$)
      )
      .subscribe(({ item }) => {
        const action = (item?.title ?? '').toLowerCase();

        if (action === 'profile') {
          this.router.navigate(['/pages/mon-profil']);
          return;
        }

        if (action === 'log out') {
          this.authService.logout();
          this.router.navigate(['/login']);
        }
      });
  }

  get filteredSearchItems(): SearchResultItem[] {
    const query = this.searchQuery.trim().toLowerCase();

    if (!query) {
      return [];
    }

    return this.searchItems
      .filter((item) => {
        const haystack = [item.label, item.description, ...item.keywords].join(' ').toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 6);
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
    this.searchQuery = '';
  }

  openSearchResult(item: SearchResultItem): void {
    this.searchQuery = item.label;
    this.searchFocused = false;
    void this.router.navigate([item.route]);
  }

  onSearchEnter(): void {
    const [firstResult] = this.filteredSearchItems;

    if (firstResult) {
      this.openSearchResult(firstResult);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
