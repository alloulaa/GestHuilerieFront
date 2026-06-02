import { Component, OnInit } from '@angular/core';
import { NbCardModule, NbProgressBarModule } from '@nebular/theme';
import { NgFor, NgIf } from '@angular/common';
import { NgxEchartsModule } from 'ngx-echarts';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ProductionDashboardService } from '../../services/production-dashboard.service';
import { MachineService } from '../../../machines/services/machine.service';
import { ExecutionProductionService } from '../../../production/services/execution-production.service';
import { Router } from '@angular/router';
import { PermissionService } from '../../../../core/services/permission.service';
import {
  MachineLoad,
  OperationStatus,
  ProductionDashboardSummary,
  QualitySection,
} from '../../models/production-dashboard.models';
import { Machine } from '../../../machines/models/enterprise.models';
import { ExecutionProduction } from '../../../production/models/production.models';
import { AuthService } from '../../../../core/auth/auth.service';

interface MachineStateGroup {
  key: string;
  label: string;
  machines: string[];
}

@Component({
  selector: 'app-production-dashboard',
  templateUrl: './production-dashboard.component.html',
  styleUrls: ['./production-dashboard.component.scss'],
  standalone: true,
  imports: [
    NbCardModule,
    NbProgressBarModule,
    NgFor,
    NgxEchartsModule,
    NgIf,
  ],
})
export class ProductionDashboardComponent implements OnInit {
  summary: ProductionDashboardSummary | null = null;
  loading = false;
  errorMessage = '';
  machinesLoaded = false;
  private selectedHuilerieId: number | null = null;
  qualityPerformanceFilterMode: 'day' | 'week' = 'day';
  executions: ExecutionProduction[] = [];

  productionCards: Array<{ label: string; value: string; extra: string }> = [];
  operations: Array<{ name: string; status: string; line: string }> = [];
  showAllOperations = false;
  machineLoad: Array<{ machine: string; load: number; quantity: string }> = [];
  machineStateGroups: MachineStateGroup[] = this.buildEmptyMachineGroups();
  qualityParams: Array<{ label: string; value: string; target: string }> = [];

  aiReadiness = 0;

  // ── Chart shared axis style ─────────────────────────────────────────────
  private axisStyle = {
    axisLine: { lineStyle: { color: '#b8cc88' } },
    axisLabel: { color: '#8a9470', fontSize: 11 },
    axisTick: { show: false },
  };

  private splitLine = { splitLine: { lineStyle: { color: '#ede8dd', type: 'dashed' as const } } };

  // ── Extraction horaire ──────────────────────────────────────────────────
  hourlyExtractionOptions: any = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#ede8dd',
      borderWidth: 1,
      textStyle: { color: '#1c2a0e', fontSize: 12 },
      formatter: (p: any) => `<b>${p[0].axisValue}</b><br/>${p[0].value} l`,
    },
    grid: { left: 40, right: 20, top: 24, bottom: 28 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: [],
      ...this.axisStyle,
      axisLine: { lineStyle: { color: '#ede8dd' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: '{value} l', color: '#8a9470', fontSize: 11 },
      ...this.splitLine,
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'line',
        data: [],
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        showSymbol: true,
        lineStyle: { width: 3, color: '#7a9c3a' },
        itemStyle: {
          color: '#7a9c3a',
        },
        areaStyle: { color: 'rgba(122, 156, 58, 0.12)' },
        emphasis: {
          focus: 'series',
        },
      },
    ],
  };

  filterMode: 'day' | 'week' = 'day';

  // ── Performance par étape ───────────────────────────────────────────────
  processPerformanceOptions: any = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#ede8dd',
      borderWidth: 1,
      textStyle: { color: '#1c2a0e', fontSize: 12 },
      formatter: (params: any) => `<b>${params[0].axisValue}</b><br/>${params[0].value} %`,
    },
    grid: { left: 40, right: 20, top: 24, bottom: 28 },
    xAxis: {
      type: 'category',
      data: ['Extra Vierge', 'Vierge', 'Lampante'],
      ...this.axisStyle,
      axisLine: { lineStyle: { color: '#ede8dd' } },
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: { formatter: '{value}%', color: '#8a9470', fontSize: 11 },
      ...this.splitLine,
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'line',
        data: [0, 0, 0],
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        itemStyle: {
          color: '#4a6520',
        },
        lineStyle: { width: 3, color: '#4a6520' },
        areaStyle: {
          color: 'rgba(74, 101, 32, 0.08)',
        },
        label: {
          show: true,
          position: 'top',
          formatter: '{c}%',
          color: '#3a4d25',
          fontSize: 11,
          fontWeight: 600,
        },
      },
    ],
  };

  constructor(
    private dashboardService: ProductionDashboardService,
    private machineService: MachineService,
    private executionProductionService: ExecutionProductionService,
    private router: Router,
    private route: ActivatedRoute,
    private permissionService: PermissionService,
    private authService: AuthService,

  ) { }

  ngOnInit(): void {
    // Prevent Admin users from viewing the Responsable production dashboard.
    if (this.authService.isCurrentUserAdmin && this.authService.isCurrentUserAdmin()) {
      void this.router.navigate(['/pages/dashboard/admin']);
      return;
    }

    this.selectedHuilerieId = this.resolveSelectedHuilerieId();
    this.loadDashboard();
    this.loadMachineStates();
    this.loadQualityPerformanceData();
    // real-time update when a production is added elsewhere in the app
    this.dashboardService.productionAdded$.subscribe((p) => {
      try {
        if (!this.summary?.productionProcess) return;

        const selectedRange = this.getSelectedRange();
        if (!selectedRange) return;

        const productionDate = new Date(String(p.date));
        if (Number.isNaN(productionDate.getTime())) return;

        const start = new Date(selectedRange.from);
        start.setHours(0, 0, 0, 0);
        const end = new Date(selectedRange.to);
        end.setHours(23, 59, 59, 999);
        if (productionDate < start || productionDate > end) return;

        const hour = productionDate.getHours();
        const hourLabel = `${String(hour).padStart(2, '0')}h`;
        const point = this.summary.productionProcess.extractionHoraire?.find((pt) => pt.heure === hourLabel);
        if (point) {
          point.quantite = (Number(point.quantite ?? 0) + Number(p.quantite ?? 0));
        } else {
          // if not found, add to array
          this.summary.productionProcess.extractionHoraire = [
            ...(this.summary.productionProcess.extractionHoraire ?? []),
            { heure: hourLabel, quantite: Number(p.quantite ?? 0) },
          ];
        }

        this.patchHourlyExtractionChart(this.summary);
      } catch (e) {
        // ignore update errors
      }
    });
  }

  get hasGlobalIndicators(): boolean {
    // Backend requires both DASHBOARD and GUIDE_PRODUCTION to show global indicators
    return !!this.summary?.globalIndicators
      && this.permissionService.canRead('DASHBOARD')
      && this.permissionService.canRead('GUIDE_PRODUCTION');
  }

  get hasReceptionLots(): boolean {
    return !!this.summary?.receptionLots && this.permissionService.canRead('RECEPTION');
  }

  get hasProductionProcess(): boolean {
    return !!this.summary?.productionProcess && this.permissionService.canRead('GUIDE_PRODUCTION');
  }

  get hasMachines(): boolean {
    return this.machinesLoaded && this.permissionService.canRead('MACHINES');
  }

  get hasQuality(): boolean {
    return !!this.summary?.quality && this.permissionService.canRead('GUIDE_PRODUCTION');
  }

  get hasStockMovements(): boolean {
    return !!this.summary?.stockMovements && this.permissionService.canRead('STOCK_MOUVEMENT');
  }

  get machineActivesVsInactives(): string {
    const machines = this.summary?.machines;
    if (!machines) {
      return '-';
    }
    return `${machines.machinesActives} actives / ${machines.machinesInactives} inactives`;
  }

  private loadDashboard(): void {
    this.loading = true;
    this.errorMessage = '';

    const dateTo = new Date();
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 30);

    this.dashboardService.getSummary(this.toIsoDate(dateFrom), this.toIsoDate(dateTo), this.selectedHuilerieId).subscribe({
      next: (summary) => {
        this.summary = summary;
        this.applySummary(summary);
        this.refreshFilteredSections();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Impossible de charger les données du dashboard de production.';
      },
    });
  }

  private loadMachineStates(): void {
    this.machineService.getAll(undefined, undefined, this.selectedHuilerieId).subscribe({
      next: (machines) => {
        this.machineStateGroups = this.groupMachinesByState(machines ?? []);
        this.machinesLoaded = true;
      },
      error: () => {
        this.machineStateGroups = this.buildEmptyMachineGroups();
        this.machinesLoaded = true;
      },
    });
  }

  private loadQualityPerformanceData(): void {
    this.executionProductionService.getAll().subscribe({
      next: (executions) => {
        this.executions = executions ?? [];
        this.refreshQualityPerformanceChart();
      },
      error: () => {
        this.executions = [];
        this.refreshQualityPerformanceChart();
      },
    });
  }

  setQualityPerformanceFilter(mode: 'day' | 'week'): void {
    if (this.qualityPerformanceFilterMode === mode) {
      return;
    }

    this.qualityPerformanceFilterMode = mode;
    this.refreshQualityPerformanceChart();
  }

  setExtractionFilter(mode: 'day' | 'week'): void {
    if (this.filterMode === mode) {
      return;
    }

    this.filterMode = mode;
    this.applyFilter();
  }

  applyFilter(): void {
    this.refreshFilteredSections();
  }

  private refreshFilteredSections(): void {
    try {
      const range = this.getSelectedRange();
      if (!range) {
        return;
      }

      this.dashboardService.getSummary(this.toIsoDate(range.from), this.toIsoDate(range.to), this.selectedHuilerieId).subscribe({
        next: (summary) => {
          this.machineLoad = this.buildMachineLoad(summary.machines?.chargeParMachine ?? []);
          this.patchHourlyExtractionChart(summary);
        },
        error: () => {
          this.errorMessage = 'Impossible de charger les données de l\'extraction horaire.';
        },
      });
    } catch {
      // ignore parse errors
    }
  }

  private getSelectedRange(): { from: Date; to: Date } | null {
    const selectedDay = new Date();
    selectedDay.setHours(0, 0, 0, 0);
    let from = selectedDay;
    let to = selectedDay;

    if (this.filterMode === 'week') {
      // Rolling week: selected day + previous 6 days.
      to = new Date(selectedDay);
      from = new Date(selectedDay);
      from.setDate(selectedDay.getDate() - 6);
    }

    return { from, to };
  }

  private applySummary(summary: ProductionDashboardSummary): void {
    this.productionCards = this.buildCards(summary);
    this.operations = this.buildOperations(summary.productionProcess?.topOperations ?? []);
    this.machineLoad = this.buildMachineLoad(summary.machines?.chargeParMachine ?? []);
    this.qualityParams = this.buildQualityItems(summary.quality);
    this.aiReadiness = this.computeReadiness(summary);

    this.patchHourlyExtractionChart(summary);
    this.patchQualityDistributionChart(summary.quality);
  }

  private buildCards(summary: ProductionDashboardSummary): Array<{ label: string; value: string; extra: string }> {
    const cards: Array<{ label: string; value: string; extra: string }> = [];
    if (summary.receptionLots && this.permissionService.canRead('RECEPTION')) {
      cards.push({
        label: 'Quantités reçues',
        value: `${this.formatNumber(summary.receptionLots.lotsRecusAujourdhui)} lots`,
        extra: `${this.formatNumber(summary.receptionLots.matiereRecueAujourdhui ?? summary.receptionLots.stockUtilisable)} kg reçus aujourd\'hui`,
      });
    }

    if (summary.globalIndicators && this.permissionService.canRead('DASHBOARD') && this.permissionService.canRead('GUIDE_PRODUCTION')) {
      const quantite = summary.globalIndicators.quantiteProduiteAujourdhui ?? summary.globalIndicators.quantiteProduitePeriode;
      const todayIso = this.toIsoDate(new Date());
      const daily = summary.globalIndicators.dailyRendements ?? [];
      const found = daily.find((d) => d.date === todayIso);
      const rendement = found ? found.rendement : summary.globalIndicators.rendementMoyenReel;

      cards.push(
        {
          label: 'Rendement moyen réel',
          value: `${this.formatNumber(rendement)} %`,
          extra: `${summary.globalIndicators.executionsEnCours} exécutions en cours`,
        },
        {
          label: 'Quantité produite ',
          value: `${this.formatNumber(quantite)} l`,
          extra: `${summary.globalIndicators.executionsTermineesAujourdhui} exécutions terminées aujourd\'hui`,
        },
      );
    }

    if (summary.stockMovements && this.permissionService.canRead('STOCK_MOUVEMENT')) {
      const totalMovements =
        (summary.stockMovements.entreesAujourdhui ?? 0)
        + (summary.stockMovements.sortiesAujourdhui ?? 0)
        + (summary.stockMovements.transfertsAujourdhui ?? 0);
      cards.push({
        label: 'Mouvements du jour',
        value: `${summary.stockMovements.entreesAujourdhui}/${summary.stockMovements.sortiesAujourdhui}/${summary.stockMovements.transfertsAujourdhui}`,
        extra: 'Entrées / Ajustements / Transferts',
      });
    }

    return cards;
  }

  private buildOperations(items: OperationStatus[]): Array<{ name: string; status: string; line: string }> {
    return items.map((item) => ({
      name: item.reference || '-',
      status: item.statut || '-',
      line: item.machine || '-',
    }));
  }

  get visibleOperations(): Array<{ name: string; status: string; line: string }> {
    if (!this.operations) return [];
    return this.showAllOperations ? this.operations : this.operations.slice(0, 5);
  }

  toggleShowAllOperations(): void {
    this.showAllOperations = !this.showAllOperations;
  }

  openExecution(reference: string): void {
    if (!reference) return;
    try {
      this.router.navigate(['/production', 'executions', reference]);
    } catch {
      // ignore routing errors
    }
  }

  private extractDateFromReference(ref: string): Date | null {
    if (!ref) return null;
    const m = String(ref).match(/(\d{8})(\d{6,9})?/);
    if (!m) return null;
    const datePart = m[1];
    const timePart = m[2] ?? '';
    const year = Number(datePart.slice(0, 4));
    const month = Number(datePart.slice(4, 6));
    const day = Number(datePart.slice(6, 8));
    let hour = 0; let min = 0; let sec = 0;
    if (timePart.length >= 6) {
      hour = Number(timePart.slice(0, 2));
      min = Number(timePart.slice(2, 4));
      sec = Number(timePart.slice(4, 6));
    }
    const d = new Date(year, month - 1, day, hour, min, sec);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  }

  formatRefDateAgo(ref: string): string {
    const d = this.extractDateFromReference(ref);
    if (!d) return '';
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}j`;
  }

  private buildMachineLoad(items: MachineLoad[]): Array<{ machine: string; load: number; quantity: string }> {
    const max = Math.max(1, ...items.map((item) => Number(item.quantite ?? 0)));

    return items.map((item) => ({
      machine: item.machine || '-',
      load: Math.round((Number(item.quantite ?? 0) / max) * 100),
      quantity: `${this.formatNumber(item.quantite)} ${item.unite || ''}`.trim(),
    }));
  }

  private refreshQualityPerformanceChart(): void {
    const range = this.getQualityPerformanceRange();
    const filteredExecutions = this.executions.filter((execution) => {
      const executionDate = this.parseDateTime(execution.dateFinPrevue);
      if (!executionDate) {
        return false;
      }

      return executionDate >= range.from && executionDate <= range.to;
    });

    const counts = {
      extraVierge: 0,
      vierge: 0,
      lampante: 0,
    };

    filteredExecutions.forEach((execution) => {
      const category = this.normalizeQualityCategory(execution.produitFinalQualite);
      if (category === 'EXTRA_VIERGE') {
        counts.extraVierge++;
      } else if (category === 'VIERGE') {
        counts.vierge++;
      } else if (category === 'LAMPANTE') {
        counts.lampante++;
      }
    });

    const total = Math.max(1, counts.extraVierge + counts.vierge + counts.lampante);
    const values = [
      this.round2((counts.extraVierge / total) * 100),
      this.round2((counts.vierge / total) * 100),
      this.round2((counts.lampante / total) * 100),
    ];

    this.processPerformanceOptions = {
      ...this.processPerformanceOptions,
      series: [
        {
          ...this.processPerformanceOptions.series[0],
          data: values,
        },
      ],
    };
  }

  private getQualityPerformanceRange(): { from: Date; to: Date } {
    const selectedDay = new Date();
    selectedDay.setHours(0, 0, 0, 0);

    const from = new Date(selectedDay);
    from.setHours(0, 0, 0, 0);

    const to = new Date(selectedDay);
    to.setHours(23, 59, 59, 999);

    if (this.qualityPerformanceFilterMode === 'week') {
      from.setDate(from.getDate() - 6);
    }

    return { from, to };
  }

  private normalizeQualityCategory(value: string | null | undefined): string {
    const normalized = String(value ?? '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (!normalized) {
      return '';
    }

    if (normalized.includes('EXTRA')) {
      return 'EXTRA_VIERGE';
    }
    if (normalized.includes('LAMPANTE')) {
      return 'LAMPANTE';
    }
    if (normalized.includes('VIERGE')) {
      return 'VIERGE';
    }

    return '';
  }

  private parseDateTime(value: string | null | undefined): Date | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date;
  }

  private buildEmptyMachineGroups(): MachineStateGroup[] {
    return [
      { key: 'EN_SERVICE', label: 'En service', machines: [] },
      { key: 'MAINTENANCE', label: 'En maintenance', machines: [] },
      { key: 'DESACTIVEE', label: 'Désactivée', machines: [] },
      { key: 'SURVEILLANCE', label: 'En surveillance', machines: [] },
    ];
  }

  private resolveSelectedHuilerieId(): number | null {
    const queryValue = this.route.snapshot.queryParamMap.get('huilerieId');
    const stateValue = typeof history !== 'undefined' ? history.state?.huilerieId : null;
    const candidate = queryValue ?? stateValue ?? this.authService.getCurrentUserHuilerieId();
    const parsed = Number(candidate ?? 0);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private groupMachinesByState(machines: Machine[]): MachineStateGroup[] {
    const groups = this.buildEmptyMachineGroups();
    const byState = new Map(groups.map((group) => [group.key, group]));

    machines.forEach((machine) => {
      const group = byState.get(this.normalizeMachineState(machine.etatMachine));
      if (group && machine.nomMachine) {
        group.machines.push(machine.nomMachine);
      }
    });

    return groups;
  }

  private normalizeMachineState(value: string): string {
    return String(value ?? '').trim().toUpperCase();
  }

  private buildQualityItems(quality: QualitySection | null | undefined): Array<{ label: string; value: string; target: string }> {
    if (!quality) {
      return [];
    }

    return [
      {
        label: 'Acidité moyenne',
        value: `${this.formatNumber(quality.aciditeMoyenne)} %`,
        target: '< 0.8 %',
      },
      {
        label: 'Indice de peroxyde moyen',
        value: this.formatNumber(quality.indicePeroxydeMoyen),
        target: '< 15',
      },
      {
        label: 'Polyphenols moyen',
        value: `${this.formatNumber(quality.polyphenolsMoyen)} mg/kg`,
        target: '>= 100 mg/kg',
      },
    ];
  }

  private computeReadiness(summary: ProductionDashboardSummary): number {
    let score = 0;
    if (summary.globalIndicators) score += 20;
    if (summary.receptionLots) score += 20;
    if (summary.productionProcess) score += 20;
    if (summary.machines) score += 20;
    if (summary.quality) score += 20;
    return score;
  }

  private patchHourlyExtractionChart(summary: ProductionDashboardSummary): void {
    const points = (summary.productionProcess?.extractionHoraire ?? []).slice();
    // Ensure consistent ordering by hour label
    points.sort((a, b) => String(a.heure ?? '').localeCompare(String(b.heure ?? '')));
    const isWeekMode = this.filterMode === 'week';
    const values = isWeekMode
      ? points.reduce<number[]>((accumulator, point) => {
        const previous = accumulator.length > 0 ? accumulator[accumulator.length - 1] : 0;
        accumulator.push(this.round2(previous + this.round2(point.quantite)));
        return accumulator;
      }, [])
      : points.map((point) => this.round2(point.quantite));

    this.hourlyExtractionOptions = {
      ...this.hourlyExtractionOptions,
      xAxis: {
        ...this.hourlyExtractionOptions.xAxis,
        data: points.map((point) => point.heure),
      },
      series: [
        {
          ...this.hourlyExtractionOptions.series[0],
          data: values,
        },
      ],
    };
  }

  private patchQualityDistributionChart(quality: QualitySection | null | undefined): void {
    this.refreshQualityPerformanceChart();
  }

  private toIsoDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatNumber(value: number | null | undefined): string {
    const numeric = Number(value ?? 0);
    if (!Number.isFinite(numeric)) {
      return '0';
    }
    return this.round2(numeric).toLocaleString('fr-FR');
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }

  getStatusClass(status: string): string {
    return status
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');
  }
}