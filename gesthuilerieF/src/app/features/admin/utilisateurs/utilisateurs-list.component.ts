// c:\Users\jendo\OneDrive\Bureau\GestHuilerieFront\gesthuilerieF\src\app\features\admin\utilisateurs\utilisateurs-list.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AdminService } from '../../../core/services/admin.service';

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
  filterText = '';
  filterProfilId: number | null = null;
  pageSize = 10;
  currentPage = 1;
  showForm = false;
  editingUser: any = null;
  userForm!: FormGroup;
  isLoading = false;
  isSaving = false;
  message: { type: 'success' | 'error'; text: string } | null = null;

  constructor(
    private adminService: AdminService,
    private fb: FormBuilder
  ) {}

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
      this.adminService.getProfils()
    ]).subscribe({
      next: ([usersRes, profilsRes]: any[]) => {
        this.utilisateurs = usersRes?.data ?? [];
        this.profils = profilsRes?.data ?? [];
        this.isLoading = false;
      },
      error: () => {
        this.showMessage('error', 'Erreur lors du chargement des donnees');
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
    this.editingUser = user;
    this.userForm.patchValue({
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      telephone: user.telephone,
      profilId: user.profil?.idProfil,
      huilierieId: user.huilerie?.id
    });
    this.showForm = true;
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const call = this.editingUser
      ? this.adminService.updateUtilisateur(this.editingUser.idUtilisateur, this.userForm.value)
      : this.adminService.createUtilisateur(this.userForm.value);

    call.subscribe({
      next: () => {
        this.showForm = false;
        this.loadData();
        this.showMessage('success', 'Utilisateur enregistre');
        this.isSaving = false;
      },
      error: () => {
        this.showMessage('error', 'Erreur lors de l\'enregistrement');
        this.isSaving = false;
      }
    });
  }

  onToggleActif(user: any): void {
    this.adminService.toggleActif(user.idUtilisateur).subscribe(() => {
      user.actif = !user.actif;
    });
  }

  onDelete(id: number): void {
    if (confirm('Supprimer cet utilisateur ?')) {
      this.adminService.deleteUtilisateur(id).subscribe(() => this.loadData());
    }
  }

  onPageChange(page: number): void {
    this.currentPage = page;
  }

  showMessage(type: 'success' | 'error', text: string): void {
    this.message = { type, text };
    setTimeout(() => {
      this.message = null;
    }, 3000);
  }
}
