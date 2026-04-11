// c:\Users\jendo\OneDrive\Bureau\GestHuilerieFront\gesthuilerieF\src\app\features\admin\utilisateurs\utilisateurs-list.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AdminService } from '../../../core/services/admin.service';
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
  filterText = '';
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
    private toastService: ToastService,
    private confirmDialogService: ConfirmDialogService,
  ) { }

  get filteredUtilisateurs(): any[] {
    return this.utilisateurs
      .filter((u) => this.filterProfilId === null || this.getUserProfilId(u) === this.filterProfilId)
      .filter(
        (u) =>
          !this.filterText ||
          this.getUserFullName(u).includes(this.filterText.toLowerCase()) ||
          String(u?.email ?? '').toLowerCase().includes(this.filterText.toLowerCase())
      );
  }

  get paginatedUtilisateurs(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredUtilisateurs.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredUtilisateurs.length / this.pageSize) || 1;
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
      huilierieId: [null, Validators.required]
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
    this.userForm.reset();
    this.showForm = true;
  }

  onEdit(user: any): void {
    const userId = this.getUserId(user);
    if (userId === null) {
      this.toastService.error('Édition impossible: identifiant utilisateur introuvable.');
      return;
    }

    this.editingUser = user;
    this.userForm.patchValue({
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      telephone: user.telephone,
      profilId: user.profil?.idProfil ?? user.profilId ?? user.idProfil ?? null,
      huilierieId: user.huilerie?.idHuilerie ?? user.huilerie?.id ?? user.huilerieId ?? user.idHuilerie ?? user.huilierieId ?? null,
    });
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

    const call = this.editingUser
      ? this.adminService.updateUtilisateur(editingUserId as number, this.userForm.value)
      : this.adminService.createUtilisateur(this.userForm.value);

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
      error: () => {
        this.toastService.error('Erreur lors de la suppression utilisateur.');
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
    const directName = String(user?.profil?.nom ?? user?.profil?.name ?? user?.profilNom ?? user?.nomProfil ?? '').trim();
    if (directName) {
      return directName;
    }

    const profilId = this.getUserProfilId(user);
    if (profilId === null) {
      return '-';
    }

    const profil = this.profils.find((p) => this.getProfilId(p) === profilId);
    if (!profil) {
      return '-';
    }

    return this.getProfilLabel(profil);
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

  private getUserProfilId(user: any): number | null {
    const id = Number(user?.profil?.idProfil ?? user?.profil?.id ?? user?.profilId ?? user?.idProfil ?? 0);
    return id > 0 ? id : null;
  }

  private getUserFullName(user: any): string {
    const fullName = `${String(user?.nom ?? '').trim()} ${String(user?.prenom ?? '').trim()}`.trim();
    return fullName.toLowerCase();
  }

  private getUserId(user: any): number | null {
    const id = Number(user?.idUtilisateur ?? user?.id ?? user?.utilisateurId ?? 0);
    return id > 0 ? id : null;
  }
}
