import { Component } from '@angular/core';
import { MENU_ITEMS } from './sidebar-menu';
import { NbMenuModule } from '@nebular/theme';
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

  constructor(private permissionService: PermissionService) {}

  get items() {
    return this.allItems.filter((item) => {
      // Keep group headers
      if (item.group) {
        return true;
      }

      // Map menu titles to module names
      const titleToModule: { [key: string]: string } = {
        Dashboard: 'DASHBOARD',
        'Réception': 'RECEPTION',
        'Guide de Production': 'PRODUCTION',
        Machines: 'MACHINES',
        'Matières Premières': 'MATIERES_PREMIERES',
        Stock: 'STOCK',
        'Traçabilité des Lots': 'LOTS',
        'Dashboard Admin': 'DASHBOARD_ADMIN',
        'Gestion des Huileries': 'HUILERIES',
        'Gestion Acces': 'COMPTES_PROFILS',
        'Affectation Utilisateurs': 'COMPTES_PROFILS'
      };

      const moduleName = titleToModule[item.title!];

      // Admin items visible only to admins
      if (
        item.title === 'Dashboard Admin' ||
        item.title === 'Gestion des Huileries' ||
        item.title === 'Gestion Acces' ||
        item.title === 'Affectation Utilisateurs'
      ) {
        return this.permissionService.isAdmin() || this.permissionService.hasAnyPermission('COMPTES_PROFILS');
      }

      // Other items visible if user has any permission on the module
      if (moduleName) {
        return this.permissionService.hasAnyPermission(moduleName)
            || this.permissionService.isAdmin();
      }

      // Default: show item
      return true;
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
