import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-access-pending',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './access-pending.component.html',
  styleUrls: ['./access-pending.component.scss'],
})
export class AccessPendingComponent {
  isChecking = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private permissionService: PermissionService,
    private toastService: ToastService,
  ) {}

  refreshAccess(): void {
    if (this.isChecking) {
      return;
    }

    this.isChecking = true;
    this.authService.getMe().subscribe({
      next: () => {
        this.isChecking = false;
        if (this.hasAssignedPermissions()) {
          void this.router.navigateByUrl('/pages');
          return;
        }

        this.toastService.show('info', 'Permissions toujours en attente. Reessayez dans quelques instants.', 4500);
      },
      error: () => {
        this.isChecking = false;
        this.toastService.show('error', 'Impossible de verifier les permissions pour le moment.', 4500);
      },
    });
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }

  private hasAssignedPermissions(): boolean {
    if (this.permissionService.isAdmin()) {
      return true;
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

    return modules.some((moduleName) => this.permissionService.hasAnyPermission(moduleName));
  }
}
