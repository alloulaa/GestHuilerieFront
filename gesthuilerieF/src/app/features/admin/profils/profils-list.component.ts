// c:\Users\jendo\OneDrive\Bureau\GestHuilerieFront\gesthuilerieF\src\app\features\admin\profils\profils-list.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-profils-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './profils-list.component.html',
  styleUrl: './profils-list.component.scss'
})
export class ProfilsListComponent implements OnInit {
  profils: any[] = [];
  searchText = '';
  currentPage = 1;
  pageSize = 5;
  readonly pageSizeOptions = [5, 10, 20];
  isLoading = false;
  showCreateForm = false;
  showEditForm = false;
  editingProfil: any = null;
  createForm: FormGroup;
  editForm: FormGroup;

  constructor(
    private adminService: AdminService,
    private router: Router,
    private fb: FormBuilder,
    private toastService: ToastService,
    private confirmDialogService: ConfirmDialogService,
  ) {
    this.createForm = this.fb.group({
      nom: ['', Validators.required],
      description: ['']
    });

    this.editForm = this.fb.group({
      nom: ['', Validators.required],
      description: ['']
    });
  }

  ngOnInit(): void {
    this.loadProfils();
  }

  get filteredProfils(): any[] {
    const query = this.searchText.trim().toLowerCase();
    if (!query) {
      return this.profils;
    }

    return this.profils.filter((profil) => {
      const nom = (profil?.nom ?? '').toLowerCase();
      const description = (profil?.description ?? '').toLowerCase();
      return nom.includes(query) || description.includes(query);
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredProfils.length / this.pageSize));
  }

  get paginatedProfils(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredProfils.slice(start, start + this.pageSize);
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }

    this.currentPage = page;
  }

  onPageSizeChange(value: string): void {
    const nextSize = Number(value);
    if (!Number.isNaN(nextSize) && nextSize > 0) {
      this.pageSize = nextSize;
      this.currentPage = 1;
    }
  }

  loadProfils(): void {
    this.isLoading = true;
    this.adminService.getProfils().subscribe({
      next: (res: any) => {
        this.profils = res?.data ?? [];
        this.currentPage = 1;
        this.isLoading = false;
      },
      error: () => {
        this.toastService.error('Erreur lors du chargement des profils.');
        this.isLoading = false;
      }
    });
  }

  onCreateSubmit(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.adminService.createProfil(this.createForm.value).subscribe({
      next: () => {
        this.loadProfils();
        this.showCreateForm = false;
        this.createForm.reset({ nom: '', description: '' });
        this.toastService.success('Profil créé avec succès.');
      },
      error: () => this.toastService.error('Erreur lors de la création du profil.')
    });
  }

  onEditSubmit(): void {
    if (!this.editingProfil?.idProfil || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.adminService.updateProfil(this.editingProfil.idProfil, this.editForm.value).subscribe({
      next: () => {
        this.loadProfils();
        this.showEditForm = false;
        this.editingProfil = null;
        this.toastService.success('Profil modifié avec succès.');
      },
      error: () => this.toastService.error('Erreur lors de la modification du profil.')
    });
  }

  onEdit(profil: any): void {
    this.editingProfil = profil;
    this.editForm.patchValue({
      nom: profil?.nom ?? '',
      description: profil?.description ?? ''
    });
    this.showEditForm = true;
  }

  async onDelete(id: number): Promise<void> {
    const confirmed = await this.confirmDialogService.confirm({
      title: 'Supprimer le profil',
      message: 'Êtes-vous sûr de vouloir supprimer ce profil ? Cette action est irréversible.',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      intent: 'danger',
    });

    if (!confirmed) {
      return;
    }

    this.adminService.deleteProfil(id).subscribe({
      next: () => {
        this.loadProfils();
        this.toastService.success('Profil supprimé avec succès.');
      },
      error: () => this.toastService.error('Erreur lors de la suppression du profil.')
    });
  }

  onViewPermissions(id: number): void {
    this.router.navigate(['/admin/permissions', id]);
  }
}
