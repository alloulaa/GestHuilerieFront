import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, forwardRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NbButtonModule, NbCardModule, NbIconModule } from '@nebular/theme';
import { GuideProduction } from '../../models/production.models';
import { GuideProductionService } from '../../services/guide-production.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-guides-consulter',
  standalone: true,
  templateUrl: './guides-consulter.component.html',
  styleUrl: './guides-consulter.component.scss',
  imports: [CommonModule, NbCardModule, NbButtonModule, NbIconModule, FormsModule],
})
export class GuidesConsulterComponent implements OnInit {
  guides: GuideProduction[] = [];
  filteredGuides: GuideProduction[] = [];

  guideSearchValue = '';
  selectedHuilerieNom = '';
  selectedGuideId: number | null = null;
  private filterFeedbackPending = false;

  constructor(
    @Inject(forwardRef(() => GuideProductionService))
    private guideProductionService: GuideProductionService,
    private permissionService: PermissionService,
    private toastService: ToastService,
  ) { }

  get isAdmin(): boolean {
    return this.permissionService.isAdmin();
  }

  ngOnInit(): void {
    // Ensure clean filter state on first mount.
    this.guideSearchValue = '';

    this.reloadGuides();
  }

  filterGuides(): void {
    const search = this.guideSearchValue.toLowerCase().trim();
    if (!search) {
      this.filteredGuides = [...this.guides];
      return;
    }
    this.filteredGuides = this.guides.filter(g =>
      g.nom.toLowerCase().includes(search) ||
      g.reference.toLowerCase().includes(search) ||
      g.description.toLowerCase().includes(search)
    );
  }

  applyFilters(): void {
    this.filterFeedbackPending = true;

    if (this.isAdmin) {
      this.reloadGuides();
      return;
    }

    this.filterGuides();
    this.consumeFilterFeedback();
  }

  private consumeFilterFeedback(): void {
    if (!this.filterFeedbackPending) {
      return;
    }
    this.filterFeedbackPending = false;

    if (this.filteredGuides.length > 0) {
      return;
    }

    const huilerieValue = String(this.selectedHuilerieNom ?? '').trim();
    const search = this.guideSearchValue.trim();

    if (this.isAdmin && huilerieValue && this.guides.length === 0) {
      this.toastService.warning(`Aucun guide trouve pour l'huilerie « ${huilerieValue} ».`);
      return;
    }

    if (search) {
      this.toastService.warning(`Aucun guide ne correspond a « ${search} ».`);
      return;
    }

    if (huilerieValue) {
      this.toastService.warning(`Aucun guide trouve pour l'huilerie « ${huilerieValue} ».`);
    }
  }

  resetFilters(): void {
    this.selectedHuilerieNom = '';
    this.guideSearchValue = '';
    this.filterFeedbackPending = false;

    if (this.isAdmin) {
      this.reloadGuides();
      return;
    }

    this.filteredGuides = [...this.guides];
  }

  get selectedGuide(): GuideProduction | undefined {
    return this.guides.find((guide) => guide.idGuideProduction === this.selectedGuideId);
  }

  selectGuide(guide: GuideProduction): void {
    this.selectedGuideId = guide.idGuideProduction;
  }

  closeGuideDetails(): void {
    this.selectedGuideId = null;
  }

  stepSummary(guide: GuideProduction): string {
    const steps = guide.etapes?.length ?? 0;
    const params = (guide.etapes ?? []).reduce((total, etape) => total + (etape.parametres?.length ?? 0), 0);
    return `${steps} étape${steps > 1 ? 's' : ''} · ${params} paramètre${params > 1 ? 's' : ''}`;
  }

  private reloadGuides(selectGuideId?: number): void {
    const huilerieNom = this.isAdmin ? this.selectedHuilerieNom : undefined;
    this.guideProductionService.getAll(huilerieNom).subscribe((items) => {
      this.guides = items;
      this.filteredGuides = [...items];

      if (this.guideSearchValue.trim()) {
        this.filterGuides();
      }

      this.consumeFilterFeedback();

      if (selectGuideId) {
        const createdGuide = this.guides.find((guide) => guide.idGuideProduction === selectGuideId);
        if (createdGuide) {
          this.selectGuide(createdGuide);
        }
      }
    });
  }
}
