// c:\Users\jendo\OneDrive\Bureau\GestHuilerieFront\gesthuilerieF\src\app\features\admin\permissions\permissions-editor.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { FormsModule } from '@angular/forms';

import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

interface PermissionRow {
  moduleId: number;
  moduleNom: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExecuted: boolean;
  dirty: boolean;
}

@Component({
  selector: 'app-permissions-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './permissions-editor.component.html',
  styleUrl: './permissions-editor.component.scss'
})
export class PermissionsEditorComponent implements OnInit {
  profilId!: number;
  profilNom = '';
  permissionRows: PermissionRow[] = [];
  isSaving = false;
  isLoading = false;
  message: { type: 'success' | 'error'; text: string } | null = null;

  constructor(
    private adminService: AdminService,
    private route: ActivatedRoute,
    private router: Router,
    private toastService: ToastService,
    private confirmDialogService: ConfirmDialogService
  ) { }


  get dirtyCount(): number {
    return this.permissionRows.filter((row) => row.dirty).length;
  }

  get hasPendingChanges(): boolean {
    return this.dirtyCount > 0;
  }

  private normalizeKey(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[\s-]+/g, '_')
      .trim();
  }


  private getPermissionModuleKeys(permission: any): string[] {
    const keys = [
      permission?.moduleId,
      permission?.module?.idModule,
      permission?.module?.id,
      permission?.module?.nom,
      permission?.module?.name,
      permission?.module,
      permission?.nom,
      permission?.name,
      permission?.moduleNom,
    ];

    return keys
      .filter((value) => value !== null && value !== undefined && String(value).trim() !== '')
      .map((value) => this.normalizeKey(value));
  }

  private findExistingPermission(permissions: any[], module: any): any | undefined {
    const moduleKeys = [
      this.normalizeKey(module?.idModule),
      this.normalizeKey(module?.nom),
      this.normalizeKey(module?.name),
    ];

    return permissions.find((permission) =>
      this.getPermissionModuleKeys(permission).some((key) => moduleKeys.includes(key))
    );
  }

  ngOnInit(): void {
    this.profilId = +this.route.snapshot.params['profilId'];
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    forkJoin([
      this.adminService.getModules(),
      this.adminService.getPermissionsByProfil(this.profilId)
    ]).subscribe({
      next: ([modulesRes, permsRes]: any[]) => {
        const modules = modulesRes?.data ?? [];
        const perms = permsRes?.data ?? [];
        this.permissionRows = modules.map((m: any) => {
          const existing = this.findExistingPermission(perms, m);
          return {
            moduleId: m.idModule,
            moduleNom: m.nom,
            canCreate: !!existing?.canCreate,
            canRead: !!existing?.canRead,
            canUpdate: !!existing?.canUpdate,
            canDelete: !!existing?.canDelete,
            canExecuted: !!existing?.canExecuted,
            dirty: false
          };
        });
        this.profilNom = permsRes?.profilNom ?? '';
        this.isLoading = false;
      },
      error: () => {
        this.showMessage('error', 'Erreur lors du chargement des permissions'); this.isLoading = false;
      }
    });
  }

  onCheckboxChange(row: PermissionRow): void {
    row.dirty = true;
  }

  onSave(): void {

    this.isSaving = true;



    const payload = {
      profilId: this.profilId,
      permissions: this.permissionRows.map(r => ({
        moduleId: r.moduleId,
        canCreate: r.canCreate,
        canRead: r.canRead,
        canUpdate: r.canUpdate,
        canDelete: r.canDelete,
        canExecuted: r.canExecuted
      }))
    };

    this.adminService.bulkSavePermissions(payload).subscribe({
      next: () => {
        this.permissionRows.forEach(r => (r.dirty = false));
        this.showMessage('success', 'Permissions enregistrees');
        this.isSaving = false;
      },
      error: () => {
        this.showMessage('error', 'Erreur lors de la sauvegarde');
        this.isSaving = false;
      }
    });
  }

  async onBack(): Promise<void> {
    if (!this.hasPendingChanges) {
      this.router.navigate(['/admin/profils']);
      return;
    }

    this.toastService.info('Les modifications ne seront pas enregistrées.');

    const confirmed = await this.confirmDialogService.confirm({
      title: 'Annulation',
      message: 'Les modifications ne seront pas enregistrées. Voulez-vous quitter sans enregistrer ?',
      confirmText: 'Continuer',
      cancelText: 'Annuler',
      intent: 'danger',
    });

    if (confirmed) {
      this.router.navigate(['/admin/profils']);
    }
  }

  showMessage(type: 'success' | 'error', text: string): void {
    this.message = { type, text };
    setTimeout(() => {
      this.message = null;
    }, 3000);
  }
}
