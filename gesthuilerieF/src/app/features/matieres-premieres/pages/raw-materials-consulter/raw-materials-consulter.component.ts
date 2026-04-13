import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NbButtonModule, NbCardModule, NbInputModule } from '@nebular/theme';
import { MatierePremiere } from '../../models/raw-material.models';
import { RawMaterialService } from '../../services/raw-material.service';

@Component({
  selector: 'app-raw-materials-consulter',
  templateUrl: './raw-materials-consulter.component.html',
  styleUrls: ['./raw-materials-consulter.component.scss'],
  standalone: true,
  imports: [
    NbCardModule,
    NbInputModule,
    NbButtonModule,
    CommonModule,
    FormsModule,
  ],
})
export class RawMaterialsConsulterComponent implements OnInit {
  rawMaterials: MatierePremiere[] = [];
  huilerieSearchNom = '';
  filterMessage = '';
  pendingRawMaterialDeletion: MatierePremiere | null = null;
  deleteErrorMessage = '';

  constructor(private rawMaterialService: RawMaterialService) { }

  ngOnInit(): void {
    this.loadRawMaterials();
  }

  loadRawMaterials(huilerieNom?: string): void {
    this.rawMaterialService.getAll(huilerieNom).subscribe(data => {
      this.rawMaterials = data;
      this.filterMessage = data.length === 0 && !!String(huilerieNom ?? '').trim()
        ? 'Aucune matiere premiere trouvee pour cette huilerie.'
        : '';
    });
  }

  applyHuilerieFilter(): void {
    const normalized = String(this.huilerieSearchNom ?? '').trim();
    this.loadRawMaterials(normalized || undefined);
  }

  resetHuilerieFilter(): void {
    this.huilerieSearchNom = '';
    this.filterMessage = '';
    this.loadRawMaterials();
  }

  edit(item: MatierePremiere): void {
    // This method is called from the template but the actual edit
    // is handled by the parent or creer component
    // For now, we'll just navigate to the creer component
  }

  askRemove(item: MatierePremiere): void {
    this.pendingRawMaterialDeletion = item;
    this.deleteErrorMessage = '';
  }

  cancelRemove(): void {
    this.pendingRawMaterialDeletion = null;
    this.deleteErrorMessage = '';
  }

  confirmRemove(): void {
    if (!this.pendingRawMaterialDeletion) {
      return;
    }

    const rawMaterialToDelete = this.pendingRawMaterialDeletion;
    this.deleteErrorMessage = '';
    const identifier = rawMaterialToDelete.reference ?? rawMaterialToDelete.idMatierePremiere ?? 0;

    this.rawMaterialService.delete(identifier).subscribe({
      next: () => {
        this.rawMaterials = this.rawMaterials.filter(current => (current.reference ?? current.idMatierePremiere) !== identifier);
        this.pendingRawMaterialDeletion = null;
      },
      error: (error: HttpErrorResponse) => {
        this.deleteErrorMessage = this.getDeleteErrorMessage(error);
      },
    });
  }

  private getDeleteErrorMessage(error: HttpErrorResponse): string {
    const serverMessage = this.extractServerMessage(error);
    const normalizedMessage = serverMessage.toLowerCase();

    if (
      error.status === 409
      || normalizedMessage.includes('constraint')
      || normalizedMessage.includes('foreign key')
      || normalizedMessage.includes('utilis')
      || normalizedMessage.includes('stock')
      || normalizedMessage.includes('mouvement')
      || normalizedMessage.includes('reference')
    ) {
      return 'Cette matiere premiere est utilisee dans le systeme et ne peut pas etre supprimee.';
    }

    if (error.status === 0) {
      return 'Connexion backend impossible. Verifiez que le backend est demarre.';
    }

    return serverMessage || 'Suppression impossible pour le moment. Veuillez reessayer.';
  }

  private extractServerMessage(error: HttpErrorResponse): string {
    if (typeof error.error === 'string' && error.error.trim().length > 0) {
      return error.error.trim();
    }

    if (error.error?.message) {
      return String(error.error.message).trim();
    }

    if (error.error?.error) {
      return String(error.error.error).trim();
    }

    return '';
  }
}
