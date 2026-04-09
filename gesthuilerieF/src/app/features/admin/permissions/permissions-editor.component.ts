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

  private readonly stockMovementAliases = new Set([
    'STOCK_MOUVEMENT',
    'MOUVEMENT_STOCK',
    'STOCK_MOVEMENT',
    'STOCK_MOUVEMENTS',
    'STOCK_MOVEMENTS',
  ]);
  constructor(
    private adminService: AdminService,
    private route: ActivatedRoute,
    private router: Router,
    private toastService: ToastService,
    private confirmDialogService: ConfirmDialogService,
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

  isStockMovementModule(moduleNom: string): boolean {
    return this.stockMovementAliases.has(this.normalizeKey(moduleNom));
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
      this.normalizeKey(module?.moduleId),
      this.normalizeKey(module?.nom),
      this.normalizeKey(module?.moduleNom),
      this.normalizeKey(module?.name),
    ];

    return permissions.find((permission) =>
      this.getPermissionModuleKeys(permission).some((key) => moduleKeys.includes(key))
    );
  }

  private extractModuleFromSource(item: any): { moduleId: number; moduleNom: string } | null {
    const rawId = item?.idModule ?? item?.id ?? item?.module?.idModule ?? item?.module?.id;
    const moduleId = Number(rawId);
    const moduleNom = String(item?.nom ?? item?.name ?? item?.module?.nom ?? item?.module?.name ?? '').trim();

    if (!Number.isFinite(moduleId) || moduleId <= 0 || !moduleNom) {
      return null;
    }

    return { moduleId, moduleNom };
  }

  private buildModuleCatalog(modules: any[], permissions: any[]): Array<{ moduleId: number; moduleNom: string }> {
    const catalog = new Map<string, { moduleId: number; moduleNom: string }>();

    for (const moduleItem of modules) {
      const extracted = this.extractModuleFromSource(moduleItem);
      if (!extracted) {
        continue;
      }

      catalog.set(this.normalizeKey(extracted.moduleNom), extracted);
    }

    // Some backends omit specific modules in /modules but include them in profile permissions.
    for (const permissionItem of permissions) {
      const extracted = this.extractModuleFromSource(permissionItem);
      if (!extracted) {
        continue;
      }

      const key = this.normalizeKey(extracted.moduleNom);
      if (!catalog.has(key)) {
        catalog.set(key, extracted);
      }
    }

    return Array.from(catalog.values());
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
        const catalog = this.buildModuleCatalog(modules, perms);

        this.permissionRows = catalog.map((m: any) => {
          const existing = this.findExistingPermission(perms, m);
          const row: PermissionRow = {
            moduleId: m.moduleId,
            moduleNom: m.moduleNom,
            canCreate: !!existing?.canCreate,
            canRead: !!existing?.canRead,
            canUpdate: !!existing?.canUpdate,
            canDelete: !!existing?.canDelete,
            canExecuted: !!existing?.canExecuted,
            dirty: false
          };

          this.applyBusinessRules(row);
          return row;
        });
        this.profilNom = permsRes?.profilNom ?? '';
        this.isLoading = false;
      },
      error: () => {
        this.toastService.error('Erreur lors du chargement des permissions.');
        this.isLoading = false;
      }
    });
  }

  private applyBusinessRules(row: PermissionRow): void {
    const isStockMovement = this.isStockMovementModule(row.moduleNom);

    // READ unchecked means no action is granted.
    if (!row.canRead) {
      row.canCreate = false;
      row.canUpdate = false;
      row.canDelete = false;
      row.canExecuted = false;
      return;
    }

    // CREATE grants full write scope by default.
    if (row.canCreate) {
      row.canRead = true;
      row.canUpdate = true;
      row.canDelete = true;
      if (isStockMovement) {
        row.canExecuted = true;
      }
      return;
    }

    // Without CREATE, profile can only consult (READ only).
    row.canUpdate = false;
    row.canDelete = false;
    row.canExecuted = false;
  }

  onCheckboxChange(row: PermissionRow): void {
    this.applyBusinessRules(row);
    row.dirty = true;
  }

  async onSave(): Promise<void> {
    if (!this.hasPendingChanges) {
      this.toastService.info('Aucune modification à enregistrer.');
      return;
    }

    const confirmed = await this.confirmDialogService.confirm({
      title: 'Confirmer la sauvegarde',
      message: 'Voulez-vous enregistrer les modifications des permissions ?',
      confirmText: 'Enregistrer',
      cancelText: 'Annuler',
      intent: 'primary',
    });

    if (!confirmed) {
      return;
    }

    this.isSaving = true;

    const normalizedRows = this.permissionRows.map((row) => {
      this.applyBusinessRules(row);
      return row;
    });

    const payload = {
      profilId: this.profilId,
      permissions: normalizedRows
        .filter((r) => Number.isFinite(r.moduleId) && r.moduleId > 0)
        .map(r => ({
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
        this.toastService.success('Permissions enregistrées avec succès.');
        this.isSaving = false;
      },
      error: () => {
        this.toastService.error('Erreur lors de la sauvegarde des permissions.');
        this.isSaving = false;
      }
    });
  }

  onBack(): void {
    this.router.navigate(['/admin/profils']);
  }

}
