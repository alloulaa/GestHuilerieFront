import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, forwardRef } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NbButtonModule } from '@nebular/theme';
import { ExecutionProduction, GuideProduction } from '../../models/production.models';
import { ExecutionProductionService } from '../../services/execution-production.service';
import { GuideProductionService } from '../../services/guide-production.service';

@Component({
  selector: 'app-production-guides',
  templateUrl: './production-guides.component.html',
  styleUrls: ['./production-guides.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, NbButtonModule],
})
export class ProductionGuidesComponent implements OnInit {
  guides: GuideProduction[] = [];
  executions: ExecutionProduction[] = [];

  constructor(
    @Inject(forwardRef(() => GuideProductionService))
    private guideProductionService: GuideProductionService,
    @Inject(forwardRef(() => ExecutionProductionService))
    private executionProductionService: ExecutionProductionService,
  ) {}

  ngOnInit(): void {
    this.reloadGuides();
    this.reloadExecutions();
  }

  get guideCount(): number {
    return this.guides.length;
  }

  get executionCount(): number {
    return this.executions.length;
  }

  get etapeCount(): number {
    return this.guides.reduce((total, guide) => total + (guide.etapes?.length ?? 0), 0);
  }

  get parameterCount(): number {
    return this.guides.reduce((total, guide) => {
      return total + (guide.etapes ?? []).reduce((stepTotal, etape) => stepTotal + (etape.parametres?.length ?? 0), 0);
    }, 0);
  }

  private reloadGuides(): void {
    this.guideProductionService.getAll().subscribe((items) => {
      this.guides = items;
    });
  }

  private reloadExecutions(): void {
    this.executionProductionService.getAll().subscribe((items) => {
      this.executions = items;
    });
  }
}
