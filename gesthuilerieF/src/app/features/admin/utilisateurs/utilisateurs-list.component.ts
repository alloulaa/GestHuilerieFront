// c:\Users\jendo\OneDrive\Bureau\GestHuilerieFront\gesthuilerieF\src\app\features\admin\utilisateurs\utilisateurs-list.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/auth/auth.service';
import { PermissionService } from '../../../core/services/permission.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { HuilerieService } from '../../machines/services/huilerie.service';

@Component({
  selector: 'app-utilisateurs-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './utilisateurs-list.component.html',
  styleUrl: './utilisateurs-list.component.scss'
})
export class UtilisateursListComponent implements OnInit {
  utilisateurs: any[] = [];
  profils: any[] = [];
  huileries: any[] = [];
  currentEntrepriseId: number | null = null;
  filterText = '';
  filterHuilerieNom = '';
  filterProfilId: number | null = null;
  pageSize = 10;
  currentPage = 1;
  showForm = false;
  editingUser: any = null;
  userForm!: FormGroup;
  isLoading = false;
  isSaving = false;

  constructor(
    private adminService: AdminService,
    private fb: FormBuilder,
    private huilerieService: HuilerieService,
    private authService: AuthService,
    private permissionService: PermissionService,
    private toastService: ToastService,
    private confirmDialogService: ConfirmDialogService,

  ) { }

  get filteredUtilisateurs(): any[] {
    const huilerieQuery = this.filterHuilerieNom.trim().toLowerCase();
    return this.utilisateurs
      .filter((u) => this.filterProfilId === null || this.getUserProfilId(u) === this.filterProfilId)
      .filter((u) => !huilerieQuery || this.getUserHuilerieName(u).includes(huilerieQuery))
      .filter(
        (u) =>
          !this.filterText ||
          this.getUserFullName(u).includes(this.filterText.toLowerCase()) ||
          String(u?.email ?? '').toLowerCase().includes(this.filterText.toLowerCase())
      );
  }

  get availableHuileries(): any[] {
    if (this.currentEntrepriseId == null) {
      return this.huileries;
    }

    return this.huileries.filter((h) => Number(h?.entrepriseId ?? h?.entreprise?.idEntreprise ?? 0) === this.currentEntrepriseId);
  }

  get paginatedUtilisateurs(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredUtilisateurs.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredUtilisateurs.length / this.pageSize) || 1;
  }

  get canDeleteUsers(): boolean {
    return this.permissionService.isAdmin()
      || this.permissionService.canDelete('UTILISATEURS')
      || this.permissionService.canDelete('COMPTES_PROFILS');
  }

  ngOnInit(): void {
    this.initForm();
    this.loadData();
  }


  initForm(): void {
    this.userForm = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telephone: [''],
      profilId: [null, Validators.required],
      entrepriseId: [null, Validators.required],
      huilerieId: [null],
    });
  }

  loadData(): void {
    this.isLoading = true;
    forkJoin([
      this.adminService.getUtilisateurs(),
      this.adminService.getProfils(),
      this.huilerieService.getAll(),
    ]).subscribe({
      next: ([usersRes, profilsRes, huileriesRes]: any[]) => {
        const rawUsers = Array.isArray(usersRes) ? usersRes : (usersRes?.data ?? []);
        this.utilisateurs = rawUsers;
        this.profils = this.normalizeProfils(profilsRes?.data ?? []);
        this.huileries = huileriesRes ?? [];
        this.currentEntrepriseId = this.authService.getCurrentUserEntrepriseId() ?? this.resolveEntrepriseIdFromData();

        if (this.currentEntrepriseId != null && !this.userForm.get('entrepriseId')?.value) {
          this.userForm.patchValue({ entrepriseId: this.currentEntrepriseId });
        }

        this.syncHuilerieRules();
        this.isLoading = false;
      },
      error: () => {
        this.toastService.error('Erreur lors du chargement des données.');
        this.isLoading = false;
      }
    });
  }

  onNewUser(): void {
    this.editingUser = null;
    this.userForm.reset({ entrepriseId: this.currentEntrepriseId, huilerieId: null });
    this.syncHuilerieRules();
    this.showForm = true;
  }

  onEdit(user: any): void {
    // support payloads where the actual user is nested under a `user` property
    const payloadUser = user?.user ?? user;
    const userId = this.getUserId(payloadUser);
    if (userId === null) {
      this.toastService.error('Édition impossible: identifiant utilisateur introuvable.');
      return;
    }

    this.editingUser = payloadUser;
    const entrepriseId = this.getUserEntrepriseId(payloadUser) ?? this.currentEntrepriseId;
    const profilId = this.resolveUserProfilId(payloadUser);
    const huilerieId = this.resolveUserHuilerieId(payloadUser);

    // Debugging: log values to help diagnose missing selections (show original wrapper and normalized user)
    // eslint-disable-next-line no-console
    console.log('onEdit user data', { original: user, user: payloadUser, entrepriseId, profilId, huilerieId, availableHuileries: this.availableHuileries, profils: this.profils });

    // Ensure numeric values for select matching
    const parsedProfilId = profilId != null ? Number(profilId) : null;
    const parsedHuilerieId = huilerieId != null ? Number(huilerieId) : null;

    this.userForm.patchValue({
      nom: payloadUser.nom,
      prenom: payloadUser.prenom,
      email: payloadUser.email,
      telephone: payloadUser.telephone,
      profilId: parsedProfilId,
      entrepriseId: entrepriseId != null ? Number(entrepriseId) : entrepriseId,
      huilerieId: parsedHuilerieId,
    });

    // force update so UI bindings reflect new values
    this.userForm.get('profilId')?.updateValueAndValidity({ emitEvent: false });
    this.userForm.get('huilerieId')?.updateValueAndValidity({ emitEvent: false });

    this.syncHuilerieRules();
    this.showForm = true;
  }

  async onSubmit(): Promise<void> {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const editingUserId = this.editingUser ? this.getUserId(this.editingUser) : null;
    if (this.editingUser && editingUserId === null) {
      this.toastService.error('Mise à jour impossible: identifiant utilisateur introuvable.');
      return;
    }

    this.syncHuilerieRules();

    const confirmed = await this.confirmDialogService.confirm({
      title: this.editingUser ? 'Confirmer la modification' : 'Confirmer la création',
      message: this.editingUser
        ? 'Voulez-vous enregistrer les modifications de cet utilisateur ?'
        : 'Voulez-vous créer ce nouvel utilisateur ?',
      confirmText: 'Confirmer',
      cancelText: 'Annuler',
      intent: 'primary',
    });

    if (!confirmed) {
      return;
    }

    this.isSaving = true;

    const submitPayload = {
      ...this.userForm.value,
      idEmploye: this.editingUser?.idEmploye ?? this.editingUser?.employe?.idEmploye ?? null,
      idAdministrateur: this.editingUser?.idAdministrateur ?? this.editingUser?.administrateur?.idAdministrateur ?? null,
      idUtilisateur: this.editingUser ? editingUserId : null,
      utilisateurId: this.editingUser ? editingUserId : null,
    };

    const call = this.editingUser
      ? this.adminService.updateUtilisateur(editingUserId as number, submitPayload)
      : this.adminService.createUtilisateur(submitPayload);

    call.subscribe({
      next: () => {
        this.showForm = false;
        this.loadData();
        this.toastService.success('Utilisateur enregistré avec succès.');
        this.isSaving = false;
      },
      error: () => {
        this.toastService.error('Erreur lors de l\'enregistrement utilisateur.');
        this.isSaving = false;
      }
    });
  }

  async onToggleActif(user: any): Promise<void> {
    const userId = this.getUserId(user);
    if (userId === null) {
      this.toastService.error('Activation impossible: identifiant utilisateur introuvable.');
      return;
    }

    const nextStatus = !this.isUserActive(user);
    const confirmed = await this.confirmDialogService.confirm({
      title: nextStatus ? 'Activer utilisateur' : 'Désactiver utilisateur',
      message: `Voulez-vous ${nextStatus ? 'activer' : 'désactiver'} cet utilisateur ?`,
      confirmText: 'Confirmer',
      cancelText: 'Annuler',
      intent: 'primary',
    });

    if (!confirmed) {
      return;
    }

    this.adminService.toggleUserStatus(userId, nextStatus).subscribe({
      next: () => {
        user.actif = nextStatus;
        user.active = nextStatus;
        this.toastService.success(`Utilisateur ${user.actif ? 'activé' : 'désactivé'} avec succès.`);
      },
      error: () => {
        this.toastService.error('Erreur lors du changement de statut utilisateur.');
      },
    });
  }

  async onDelete(user: any): Promise<void> {
    if (!this.canDeleteUsers) {
      this.toastService.error('Vous n\'avez pas la permission de supprimer des utilisateurs.');
      return;
    }

    const id = this.getUserId(user);
    if (id === null) {
      this.toastService.error('Suppression impossible: identifiant utilisateur introuvable.');
      return;
    }

    const confirmed = await this.confirmDialogService.confirm({
      title: 'Supprimer utilisateur',
      message: 'Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      intent: 'danger',
    });

    if (!confirmed) {
      return;
    }

    this.adminService.deleteUtilisateur(id).subscribe({
      next: () => {
        this.loadData();
        this.toastService.success('Utilisateur supprimé avec succès.');
      },
      error: (error) => {
        this.toastService.error(this.getDeleteUtilisateurErrorMessage(error));
      },
    });
  }



  onPageChange(page: number): void {
    this.currentPage = page;
  }

  getProfilId(profil: any): number | null {
    const id = Number(profil?.idProfil ?? profil?.id ?? profil?.profilId ?? 0);
    return id > 0 ? id : null;
  }

  getProfilLabel(profil: any): string {
    return String(profil?.nom ?? profil?.name ?? '-');
  }

  getUserProfilName(user: any): string {
    const profilId = this.resolveUserProfilId(user);
    if (profilId !== null) {
      const profil = this.profils.find((item) => this.getProfilId(item) === profilId);
      const label = this.getProfilLabel(profil);
      if (label && label !== '-') {
        return label;
      }
    }

    const directName = String(
      user?.profil?.nom
      ?? user?.profil?.name
      ?? user?.profilNom
      ?? user?.nomProfil
      ?? user?.utilisateur?.profil?.nom
      ?? user?.utilisateur?.profilNom
      ?? user?.employe?.profil?.nom
      ?? user?.administrateur?.profil?.nom
      ?? '',
    ).trim();
    if (directName) {
      return directName;
    }

    if (profilId === null) {
      return '-';
    }

    const profil = this.profils.find((p) => this.getProfilId(p) === profilId);
    if (!profil) {
      return '-';
    }

    return this.getProfilLabel(profil);
  }

  getUserEntrepriseId(user: any): number | null {
    const id = Number(user?.entreprise?.idEntreprise ?? user?.entreprise?.id ?? user?.entrepriseId ?? user?.idEntreprise ?? 0);
    return id > 0 ? id : null;
  }

  getUserHuilerieName(user: any): string {
    const directName = String(
      user?.huilerie?.nom
      ?? user?.huilerie?.name
      ?? user?.huilerieNom
      ?? user?.nomHuilerie
      ?? user?.utilisateur?.huilerie?.nom
      ?? user?.utilisateur?.huilerieNom
      ?? user?.employe?.huilerie?.nom
      ?? user?.administrateur?.huilerie?.nom
      ?? '',
    ).trim();
    return directName.toLowerCase();
  }

  isUserActive(user: any): boolean {
    const raw = user?.actif ?? user?.active ?? user?.isActive ?? user?.statut ?? user?.status;

    if (typeof raw === 'boolean') {
      return raw;
    }

    if (typeof raw === 'number') {
      return raw === 1;
    }

    if (typeof raw === 'string') {
      const normalized = raw.trim().toLowerCase();
      return ['1', 'true', 'actif', 'active', 'enabled', 'enable'].includes(normalized);
    }

    return false;
  }

  isUserAdmin(user: any): boolean {
    const profilName = String(this.getUserProfilName(user) ?? '').trim().toUpperCase();
    return profilName.includes('ADMIN');
  }

  private normalizeProfils(profils: any[]): any[] {
    return profils.map((profil) => {
      const profilId = this.getProfilId(profil);
      return {
        ...profil,
        idProfil: profilId,
        nom: this.getProfilLabel(profil),
      };
    });
  }

  private resolveEntrepriseIdFromData(): number | null {
    const userEntrepriseId = this.utilisateurs.map((user) => this.getUserEntrepriseId(user)).find((id) => id != null) ?? null;
    if (userEntrepriseId) {
      return userEntrepriseId;
    }

    const huilerieEntrepriseId = this.huileries
      .map((h) => Number(h?.entrepriseId ?? h?.entreprise?.idEntreprise ?? 0))
      .find((id) => id > 0) ?? null;

    return huilerieEntrepriseId;
  }

  private isAdminProfileSelected(): boolean {
    const profilId = Number(this.userForm.get('profilId')?.value ?? 0);
    if (!profilId) {
      return false;
    }

    const profil = this.profils.find((item) => this.getProfilId(item) === profilId);
    const profilName = String(profil?.nom ?? profil?.name ?? '').trim().toUpperCase();
    return profilName.includes('ADMIN');
  }

  private syncHuilerieRules(): void {
    const huilerieControl = this.userForm.get('huilerieId');
    if (!huilerieControl) {
      return;
    }

    if (this.isAdminProfileSelected()) {
      huilerieControl.clearValidators();
      if (huilerieControl.value != null) {
        huilerieControl.setValue(null, { emitEvent: false });
      }
    } else {
      huilerieControl.setValidators([Validators.required]);
    }

    huilerieControl.updateValueAndValidity({ emitEvent: false });
  }

  private getUserProfilId(user: any): number | null {
    const id = Number(
      user?.profil?.idProfil
      ?? user?.profil?.id
      ?? user?.profilId
      ?? user?.idProfil
      ?? user?.utilisateur?.profil?.idProfil
      ?? user?.utilisateur?.profil?.id
      ?? user?.utilisateur?.profilId
      ?? user?.employe?.profil?.idProfil
      ?? user?.employe?.profil?.id
      ?? user?.employe?.profilId
      ?? user?.administrateur?.profil?.idProfil
      ?? user?.administrateur?.profil?.id
      ?? user?.administrateur?.profilId
      ?? 0,
    );
    return id > 0 ? id : null;
  }

  private resolveUserProfilId(user: any): number | null {
    // First check direct property from backend (UtilisateurAdminDTO)
    if (user?.profilId != null && user.profilId > 0) {
      return user.profilId;
    }

    // Fallback to other possible locations
    const directProfilId = this.getUserProfilId(user);
    if (directProfilId !== null) {
      return directProfilId;
    }

    // Last resort: search by name
    const directProfilName = String(
      typeof user?.profil === 'string' ? user?.profil : ''
    ).trim().toLowerCase() || String(
      user?.profil?.nom
      ?? user?.profilNom
      ?? user?.nomProfil
      ?? user?.utilisateur?.profil?.nom
      ?? user?.utilisateur?.profilNom
      ?? user?.employe?.profil?.nom
      ?? user?.administrateur?.profil?.nom
      ?? '',
    ).trim().toLowerCase();

    if (!directProfilName) {
      return null;
    }

    const matchedProfil = this.profils.find((profil) => this.getProfilLabel(profil).trim().toLowerCase() === directProfilName);
    return matchedProfil ? this.getProfilId(matchedProfil) : null;
  }

  private resolveUserHuilerieId(user: any): number | null {
    // First check direct property from backend (UtilisateurAdminDTO)
    if (user?.huilerieId != null && user.huilerieId > 0) {
      return user.huilerieId;
    }

    // Fallback to other possible locations
    const id = Number(
      user?.huilerie?.idHuilerie
      ?? user?.huilerie?.id
      ?? user?.idHuilerie
      ?? user?.utilisateur?.huilerie?.idHuilerie
      ?? user?.utilisateur?.huilerie?.id
      ?? user?.utilisateur?.huilerieId
      ?? user?.employe?.huilerie?.idHuilerie
      ?? user?.employe?.huilerie?.id
      ?? user?.employe?.huilerieId
      ?? user?.administrateur?.huilerie?.idHuilerie
      ?? user?.administrateur?.huilerie?.id
      ?? user?.administrateur?.huilerieId
      ?? 0,
    );

    if (id > 0) {
      return id;
    }

    // Last resort: resolve by huilerie name from DTO/display fields
    const directHuilerieName = String(
      user?.huilerie?.nom
      ?? user?.huilerie?.name
      ?? user?.huilerieNom
      ?? user?.nomHuilerie
      ?? user?.utilisateur?.huilerie?.nom
      ?? user?.utilisateur?.huilerieNom
      ?? user?.employe?.huilerie?.nom
      ?? user?.administrateur?.huilerie?.nom
      ?? '',
    ).trim().toLowerCase();

    if (!directHuilerieName) {
      return null;
    }

    const matchedHuilerie = this.availableHuileries.find((h) => String(h?.nom ?? h?.name ?? '').trim().toLowerCase() === directHuilerieName)
      ?? this.huileries.find((h) => String(h?.nom ?? h?.name ?? '').trim().toLowerCase() === directHuilerieName);
    const matchedHuilerieId = Number(matchedHuilerie?.idHuilerie ?? matchedHuilerie?.id ?? 0);
    return matchedHuilerieId > 0 ? matchedHuilerieId : null;
  }

  private getUserFullName(user: any): string {
    const fullName = `${String(user?.nom ?? '').trim()} ${String(user?.prenom ?? '').trim()}`.trim();
    return fullName.toLowerCase();
  }

  private getUserId(user: any): number | null {
    const hasTypedEntityId = user?.idEmploye != null || user?.idAdministrateur != null;
    const candidates = [
      user?.idUtilisateur,
      user?.utilisateurId,
      user?.utilisateur?.idUtilisateur,
      user?.utilisateur?.utilisateurId,
      user?.utilisateur?.id,
      hasTypedEntityId ? null : user?.id,
    ];

    const id = Number(candidates.find((value) => Number(value) > 0) ?? 0);
    return id > 0 ? id : null;
  }

  private getDeleteUtilisateurErrorMessage(error: any): string {
    const backendMessage = String(error?.error?.message ?? error?.error?.error ?? error?.message ?? '').toLowerCase();

    const permissionDenied =
      error?.status === 403
      || backendMessage.includes('forbidden')
      || backendMessage.includes('permission')
      || backendMessage.includes('autorisation');

    if (permissionDenied) {
      return 'Suppression refusée: vous n\'avez pas les droits nécessaires.';
    }

    const hasDependencyConflict =
      error?.status === 409
      || backendMessage.includes('constraint')
      || backendMessage.includes('foreign key')
      || backendMessage.includes('relation')
      || backendMessage.includes('lié')
      || backendMessage.includes('utilisateur');

    if (hasDependencyConflict) {
      return 'Impossible de supprimer cet utilisateur: il est encore lié à des données ou à un compte métier.';
    }

    return 'Erreur lors de la suppression utilisateur.';
  }
}
