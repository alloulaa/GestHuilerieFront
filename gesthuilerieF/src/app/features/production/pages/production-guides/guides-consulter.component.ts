import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, forwardRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NbButtonModule, NbCardModule, NbIconModule } from '@nebular/theme';
import { GuideProduction } from '../../models/production.models';
import { GuideProductionService } from '../../services/guide-production.service';

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
  selectedGuideId: number | null = null;

  constructor(
    @Inject(forwardRef(() => GuideProductionService))
    private guideProductionService: GuideProductionService,
  ) { }

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

  resetGuideFilter(): void {
    this.guideSearchValue = '';
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
    this.guideProductionService.getAll().subscribe((items) => {
      this.guides = items;
      this.filteredGuides = [...items];

      if (this.guideSearchValue.trim()) {
        this.filterGuides();
      }

      if (selectGuideId) {
        const createdGuide = this.guides.find((guide) => guide.idGuideProduction === selectGuideId);
        if (createdGuide) {
          this.selectGuide(createdGuide);
        }
      }
    });
  }
}
