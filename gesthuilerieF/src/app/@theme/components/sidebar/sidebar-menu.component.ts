import { Component } from '@angular/core';
import { MENU_ITEMS } from './sidebar-menu';
import { NbMenuItem, NbMenuModule } from '@nebular/theme';
import { PermissionService } from '../../../core/services/permission.service';

@Component({
  selector: 'ngx-sidebar-menu',
  styleUrls: ['./sidebar-menu.component.scss'],
  templateUrl: './sidebar-menu.component.html',
  standalone: true,
  imports: [NbMenuModule],
})
export class SidebarMenuComponent {
  private allItems = MENU_ITEMS;
  private readonly filteredItems: NbMenuItem[];

  constructor(private permissionService: PermissionService) {
    this.filteredItems = this.buildItems();
  }

  get items() {
    return this.filteredItems;
  }

  private buildItems(): NbMenuItem[] {
    const items = JSON.parse(JSON.stringify(this.allItems)) as NbMenuItem[];
    const titleToModule: { [key: string]: string } = {
      'Dashboard': 'DASHBOARD',
      'Réception': 'RECEPTION',
      'Guide de Production': 'GUIDE_PRODUCTION',
      'Machines': 'MACHINES',
      'Matières Premières': 'MATIERES_PREMIERES',
      'Stock': 'STOCK',
      'Traçabilité des Lots': 'LOTS_TRAÇABILITE',
      'Dashboard Admin': 'DASHBOARD_ADMIN',
      'Huileries': 'HUILERIES',
      'Stock mouvement': 'STOCK_MOUVEMENT',
      'Gestion Paramétrage': 'COMPTES_PROFILS',
    };

    const hasAnyModulePermission = (moduleNames: string[]): boolean => {
      return moduleNames.some((moduleName) => this.permissionService.hasAnyPermission(moduleName));
    };

    const hasReadModulePermission = (moduleNames: string[]): boolean => {
      return moduleNames.some((moduleName) => this.permissionService.canRead(moduleName));
    };

    const adminConfigModuleAliases = ['COMPTES_PROFILS', 'UTILISATEURS', 'PROFILS', 'PARAMETRES'];
    const adminChildToModules: { [key: string]: string[] } = {
      'Gestion Profils & Permissions': ['COMPTES_PROFILS', 'PROFILS', 'PARAMETRES'],
      'Gestion Utilisateurs': ['COMPTES_PROFILS', 'UTILISATEURS'],
    };

    return items.filter((item) => {
      // Keep group headers
      if (item.group) {
        return true;
      }

      // Admin items visible only to admins
      if (item.title === 'Dashboard Admin') {
        return this.permissionService.isAdmin() || this.permissionService.canRead('DASHBOARD_ADMIN');
      }

      if (item.title === 'Huileries') {
        return this.permissionService.isAdmin() || this.permissionService.canRead('HUILERIES');
      }

      if (item.title === 'Gestion Paramétrage') {
        if (item.children && item.children.length > 0) {
          const isAdmin = this.permissionService.isAdmin();
          item.children = item.children.filter((child) => {
            const childModules = adminChildToModules[child.title ?? ''] ?? adminConfigModuleAliases;
            return isAdmin || hasAnyModulePermission(childModules);
          });
          return item.children.length > 0;
        }

        return this.permissionService.isAdmin() || hasAnyModulePermission(adminConfigModuleAliases);
      }

      const moduleName = titleToModule[item.title!];
      if (!moduleName) {
        return false;
      }

      const isAdmin = this.permissionService.isAdmin();

      // Items with children: filter each child by action-level permissions.
      if (item.children && item.children.length > 0) {
        item.children = item.children.filter((child) => {
          if (child.title === 'Consulter') {
            return isAdmin || hasReadModulePermission([moduleName]);
          }
          if (child.title === 'Gérer') {
            return isAdmin || this.permissionService.canCreate(moduleName);
          }
          if (child.title === 'Exécuter') {
            return isAdmin || this.permissionService.canExecute(moduleName);
          }
          return isAdmin;
        });

        // Hide parent when no child remains visible.
        return item.children.length > 0;
      }

      // Items without children are visible with READ permission.
      return isAdmin || this.permissionService.canRead(moduleName);
    });
  }

  isModuleVisible(moduleName: string): boolean {
    return this.permissionService.hasAnyPermission(moduleName)
      || this.permissionService.isAdmin();
  }

  isAdminSection(): boolean {
    return this.permissionService.isAdmin();
  }
}
