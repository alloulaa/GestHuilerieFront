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
      .filter(u => !this.filterProfilId || u.profil?.idProfil === this.filterProfilId)
      .filter(
        u =>
          !this.filterText ||
          u.nom.toLowerCase().includes(this.filterText.toLowerCase()) ||
          u.email.toLowerCase().includes(this.filterText.toLowerCase())
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
        this.profils = profilsRes?.data ?? [];
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

  onSubmit(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const editingUserId = this.editingUser ? this.getUserId(this.editingUser) : null;
    if (this.editingUser && editingUserId === null) {
      this.toastService.error('Mise à jour impossible: identifiant utilisateur introuvable.');
      this.isSaving = false;
      return;
    }

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

  onToggleActif(user: any): void {
    const userId = this.getUserId(user);
    if (userId === null) {
      this.toastService.error('Activation impossible: identifiant utilisateur introuvable.');
      return;
    }

    this.adminService.toggleUserStatus(userId, !Boolean(user.actif)).subscribe({
      next: () => {
        user.actif = !Boolean(user.actif);
        this.toastService.success(`Utilisateur ${user.actif ? 'activé' : 'désactivé'} avec succès.`);
      },
      error: () => {
        this.toastService.error('Erreur lors du changement de statut utilisateur.');
      },
    });
  }

  async onDelete(id: number): Promise<void> {
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
  private getUserId(user: any): number | null {
    const id = Number(user?.idUtilisateur ?? user?.id ?? user?.utilisateurId ?? 0);
    return id > 0 ? id : null;
  }
}
