// c:\Users\jendo\OneDrive\Bureau\GestHuilerieFront\gesthuilerieF\src\app\features\admin\profils\profils-list.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { AdminService } from '../../../core/services/admin.service';

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
  message: { type: 'success' | 'error'; text: string } | null = null;

  constructor(
    private adminService: AdminService,
    private router: Router,
    private fb: FormBuilder
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
        this.showMessage('error', 'Erreur lors du chargement des profils');
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
        this.showMessage('success', 'Profil cree avec succes');
      },
      error: () => this.showMessage('error', 'Erreur lors de la creation')
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
        this.showMessage('success', 'Profil modifie avec succes');
      },
      error: () => this.showMessage('error', 'Erreur lors de la modification')
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

  onDelete(id: number): void {
    if (confirm('Supprimer ?')) {
      this.adminService.deleteProfil(id).subscribe({
        next: () => {
          this.loadProfils();
          this.showMessage('success', 'Profil supprime avec succes');
        },
        error: () => this.showMessage('error', 'Erreur lors de la suppression')
      });
    }
  }

  onViewPermissions(id: number): void {
    this.router.navigate(['/admin/permissions', id]);
  }

  showMessage(type: 'success' | 'error', text: string): void {
    this.message = { type, text };
    setTimeout(() => {
      this.message = null;
    }, 3000);
  }
}
