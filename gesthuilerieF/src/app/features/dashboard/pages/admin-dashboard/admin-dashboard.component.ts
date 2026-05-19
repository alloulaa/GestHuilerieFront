import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { NbCardModule, NbIconModule, NbListModule, NbSelectModule } from '@nebular/theme';
import { NgxEchartsModule } from 'ngx-echarts';
import { forkJoin } from 'rxjs';
import { Huilerie } from '../../../machines/models/enterprise.models';
import { AdminDashboardSummary, AdminHuilerieStat, AdminProfileStat } from '../../models/admin-dashboard.models';
import { AdminDashboardService } from '../../services/admin-dashboard.service';
import { MachineService } from '../../../machines/services/machine.service';
import { Machine } from '../../../machines/models/enterprise.models';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    NbCardModule,
    NbIconModule,
    NgxEchartsModule,
    NbListModule,
    NbSelectModule,
  ],
})
export class AdminDashboardComponent implements OnInit {
  private readonly qualityLabelMap: Record<string, string> = {
    Excellente: 'Extra Vierge',
    Bonne: 'Vierge',
    Moyenne: 'Lampante',
  };

  loading = true;
  errorMessage = '';
  selectedHuilerieId: number | null = null;
  selectedHuilerieLabel = '';
  huileries: Huilerie[] = [];
  summary: AdminDashboardSummary | null = null;

  kpis: Array<{ label: string; value: string; trend?: string; icon: string }> = [];
  rendementTrendOptions: any = this.emptyLineOptions('Rendement');
  qualityPieOptions: any = this.emptyPieOptions('Qualité');
  profilePieOptions: any = this.emptyPieOptions('Profils');
  huilerieBarOptions: any = this.emptyBarOptions('Utilisateurs');
  machineStateGroups: Array<{ key: string; label: string; machines: string[] }> = this.buildEmptyMachineGroups();
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
      axisLine: { lineStyle: { color: '#ede8dd' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: '{value} l', color: '#8a9470', fontSize: 11 },
      splitLine: { lineStyle: { color: '#ede8dd' } },
    },
    series: [
      {
        type: 'line',
        data: [],
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        showSymbol: true,
        lineStyle: {
          width: 3,
          color: '#7a9c3a',
        },
        itemStyle: {
          color: '#7a9c3a',
        },
        areaStyle: {
          color: 'rgba(122, 156, 58, 0.12)',
        },
        emphasis: {
          focus: 'series',
        },
      },
    ],
  };
  extractionFilterMode: 'day' | 'week' = 'day';
  rendementFilterMode: 'day' | 'week' = 'day';

  constructor(
    private readonly adminDashboardService: AdminDashboardService,
    private readonly machineService: MachineService,
  ) { }

  ngOnInit(): void {
    this.loadInitialData();
  }

  onSelectedHuilerieChange(value: number): void {
    this.selectedHuilerieId = value;
    this.loadSummary();
  }

  trackByHuilerieId(_: number, item: Huilerie): number {
    return item.idHuilerie;
  }

  normalizeQualityLabel(value: string | null | undefined): string {
    const normalized = String(value ?? '').trim();
    return this.qualityLabelMap[normalized] ?? normalized;
  }

  get hasProductionData(): boolean {
    return !!this.summary?.productionDashboard;
  }

  get hasUserStats(): boolean {
    return !!this.summary?.userStats;
  }

  private loadInitialData(): void {
    this.loading = true;
    this.errorMessage = '';

    const dateTo = new Date();
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 30);

    forkJoin({
      huileries: this.adminDashboardService.getHuileries(),
      summary: this.adminDashboardService.getSummary(null, this.toIsoDate(dateFrom), this.toIsoDate(dateTo)),
    }).subscribe({
      next: ({ huileries, summary }) => {
        this.huileries = huileries;
        this.summary = summary;
        this.selectedHuilerieId = summary.selectedHuilerieId ?? (huileries.length ? huileries[0].idHuilerie : null);
        this.selectedHuilerieLabel = summary.selectedHuilerieNom ?? (huileries.length ? huileries[0].nom : '');
        this.rendementFilterMode = 'day';
        this.updateDerivedState();
        this.loadMachineStates();
        this.reloadRendementChart('day');
        this.extractionFilterMode = 'day';
        this.reloadExtractionChart('day');
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger le tableau de bord administrateur.';
        this.loading = false;
      },
    });
  }

  private loadMachineStates(): void {
    const selectedId = this.selectedHuilerieId;
    const huilerieNom = selectedId == null ? undefined : this.huileries.find((h) => h.idHuilerie === selectedId)?.nom;

    this.machineService.getAll(huilerieNom).subscribe({
      next: (machines) => {
        this.machineStateGroups = this.groupMachinesByState(machines ?? []);
      },
      error: () => {
        this.machineStateGroups = this.buildEmptyMachineGroups();
      },
    });
  }

  private loadSummary(): void {
    this.loading = true;
    this.errorMessage = '';

    const huilerieId = this.selectedHuilerieId;
    const dateTo = new Date();
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 30);

    this.adminDashboardService.getSummary(huilerieId, this.toIsoDate(dateFrom), this.toIsoDate(dateTo)).subscribe({
      next: (summary) => {
        this.summary = summary;
        this.selectedHuilerieId = summary.selectedHuilerieId ?? this.selectedHuilerieId;
        this.selectedHuilerieLabel = summary.selectedHuilerieNom ?? this.selectedHuilerieLabel;
        this.rendementFilterMode = 'day';
        this.updateDerivedState();
        // reload machines for the selected huilerie
        this.loadMachineStates();
        this.reloadRendementChart('day');
        // reload extraction chart according to currently selected mode (day/week)
        this.reloadExtractionChart(this.extractionFilterMode);
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les indicateurs pour cette huilerie.';
        this.loading = false;
      },
    });
  }

  setExtractionFilter(mode: 'day' | 'week'): void {
    if (this.extractionFilterMode === mode) return;
    this.extractionFilterMode = mode;
    this.reloadExtractionChart(mode);
  }

  setRendementFilter(mode: 'day' | 'week'): void {
    if (this.rendementFilterMode === mode) return;
    this.rendementFilterMode = mode;
    this.reloadRendementChart(mode);
  }

  private getSelectedRangeByMode(mode: 'day' | 'week'): { from: Date; to: Date } {
    const selectedDay = new Date();
    selectedDay.setHours(0, 0, 0, 0);
    let from = selectedDay;
    let to = selectedDay;

    if (mode === 'week') {
      to = new Date(selectedDay);
      from = new Date(selectedDay);
      from.setDate(selectedDay.getDate() - 6);
    }

    return { from, to };
  }

  private reloadExtractionChart(mode: 'day' | 'week'): void {
    const huilerieId = this.selectedHuilerieId;
    const range = this.getSelectedRangeByMode(mode);
    this.adminDashboardService.getSummary(huilerieId, this.toIsoDate(range.from), this.toIsoDate(range.to)).subscribe({
      next: (summary) => {
        const points = summary?.productionDashboard?.productionProcess?.extractionHoraire ?? [];
        this.patchHourlyExtractionChart(points);
      },
      error: () => {
        // keep existing chart data on error
      },
    });
  }

  private reloadRendementChart(mode: 'day' | 'week'): void {
    const huilerieId = this.selectedHuilerieId;
    const range = this.getSelectedRangeByMode(mode);
    this.adminDashboardService.getSummary(huilerieId, this.toIsoDate(range.from), this.toIsoDate(range.to)).subscribe({
      next: (summary) => {
        const daily = summary?.productionDashboard?.globalIndicators?.dailyRendements ?? [];
        this.rendementTrendOptions = this.buildRendementOptions(daily);
      },
      error: () => {
        // ignore
      },
    });
  }

  private updateDerivedState(): void {
    const production = this.summary?.productionDashboard ?? null;
    const stats = this.summary?.userStats ?? null;

    const todayIso = this.toIsoDate(new Date());
    const daily = production?.globalIndicators?.dailyRendements ?? [];
    const todayEntry = daily.find((d: any) => d.date === todayIso);

    this.kpis = [
      {
        label: 'Rendement moyen réel',
        value: this.formatPercent(todayEntry ? todayEntry.rendement : (production?.globalIndicators?.rendementMoyenReel ?? null)),
        trend: 'Production globale',
        icon: 'trending-up-outline',
      },
      {
        label: 'Utilisateurs actifs',
        value: this.formatCount(stats?.activeUsers ?? null),
        trend: `${this.formatCount(stats?.totalUsers ?? null)} au total`,
        icon: 'people-outline',
      },
      {
        label: 'Profils configurés',
        value: this.formatCount(stats?.profilesConfiguredCount ?? null),
        trend: `${this.formatCount(stats?.adminUsers ?? null)} admins`,
        icon: 'shield-outline',
      },
      {
        label: 'Machines actives',
        value: this.formatCount(production?.machines?.machinesActives ?? null),
        trend: `${this.formatCount(production?.machines?.machinesInactives ?? null)} inactives`,
        icon: 'settings-2-outline',
      },
    ];
    this.rendementTrendOptions = this.buildRendementOptions(production?.globalIndicators?.dailyRendements ?? []);
    this.qualityPieOptions = this.buildQualityOptions(production?.quality?.repartitionQualiteFinale ?? null);
    this.profilePieOptions = this.buildProfileOptions(stats?.profiles ?? []);
    this.huilerieBarOptions = this.buildHuilerieOptions(stats?.huileries ?? []);
    // Rendement and extraction charts are reloaded separately with the active filter mode.
  }

  private buildRendementOptions(dailyRendements: Array<{ date: string; rendement: number }>): any {
    const labels = dailyRendements.map((entry) => entry.date);
    const values = dailyRendements.map((entry) => entry.rendement ?? 0);

    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 45, right: 20, top: 30, bottom: 42 },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: labels,
        axisLine: { lineStyle: { color: '#9aa4b2' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#e6eadf' } },
      },
      series: [
        {
          name: 'Rendement',
          type: 'line',
          smooth: true,
          data: values,
          lineStyle: { color: '#7e9440', width: 3 },
          areaStyle: { color: 'rgba(126, 148, 64, 0.18)' },
          itemStyle: { color: '#7e9440' },
        },
      ],
    };
  }

  private buildQualityOptions(repartition: { extraVierge?: number; vierge?: number; lampante?: number } | null): any {
    const extraVierge = repartition?.extraVierge ?? 0;
    const vierge = repartition?.vierge ?? 0;
    const lampante = repartition?.lampante ?? 0;

    return {
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [
        {
          type: 'pie',
          radius: ['45%', '72%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
          label: { show: true, formatter: '{b}: {d}%' },
          color: ['#7e9440', '#a9bc75', '#5f6f34'],
          data: [
            { value: extraVierge, name: 'Extra Vierge' },
            { value: vierge, name: 'Vierge' },
            { value: lampante, name: 'Lampante' },
          ],
        },
      ],
    };
  }

  private buildEmptyMachineGroups(): Array<{ key: string; label: string; machines: string[] }> {
    return [
      { key: 'EN_SERVICE', label: 'En service', machines: [] },
      { key: 'MAINTENANCE', label: 'En maintenance', machines: [] },
      { key: 'DESACTIVEE', label: 'Désactivée', machines: [] },
      { key: 'SURVEILLANCE', label: 'En surveillance', machines: [] },
    ];
  }

  private patchHourlyExtractionChart(points: Array<{ heure: string; quantite: number }>): void {
    const pts = (points ?? []).slice();
    // Ensure points are ordered by hour label to match production dashboard
    pts.sort((a, b) => String(a.heure ?? '').localeCompare(String(b.heure ?? '')));
    const isWeekMode = this.extractionFilterMode === 'week';
    const values = isWeekMode
      ? pts.reduce<number[]>((accumulator, point) => {
        const previous = accumulator.length > 0 ? accumulator[accumulator.length - 1] : 0;
        accumulator.push(this.round2(previous + this.round2(point.quantite ?? 0)));
        return accumulator;
      }, [])
      : pts.map((point) => this.round2(point.quantite ?? 0));

    this.hourlyExtractionOptions = {
      ...this.hourlyExtractionOptions,
      xAxis: {
        ...this.hourlyExtractionOptions.xAxis,
        data: pts.map((p) => p.heure),
      },
      series: [
        {
          ...this.hourlyExtractionOptions.series[0],
          data: values,
        },
      ],
    };
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private groupMachinesByState(machines: Machine[]): Array<{ key: string; label: string; machines: string[] }> {
    const groups = this.buildEmptyMachineGroups();
    const byState = new Map(groups.map((g) => [g.key, g]));

    machines.forEach((m) => {
      const key = this.normalizeMachineState(m.etatMachine);
      const group = byState.get(key);
      if (group && m.nomMachine) {
        group.machines.push(m.nomMachine);
      }
    });

    return groups;
  }

  private normalizeMachineState(value: string): string {
    return String(value ?? '').trim().toUpperCase();
  }

  private buildProfileOptions(profiles: AdminProfileStat[]): any {
    return {
      tooltip: { trigger: 'item' },
      legend: { bottom: 0, type: 'scroll' },
      series: [
        {
          type: 'pie',
          radius: ['42%', '70%'],
          itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
          label: { show: true, formatter: '{b}: {d}%' },
          color: ['#253858', '#7e9440', '#c7b86b', '#8c9aa8', '#b3a16f'],
          data: profiles.map((profile) => ({
            value: profile.usersCount ?? 0,
            name: profile.profilNom ?? `Profil ${profile.profilId}`,
          })),
        },
      ],
    };
  }

  private buildHuilerieOptions(huileries: AdminHuilerieStat[]): any {
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 36, right: 20, top: 26, bottom: 55 },
      xAxis: {
        type: 'category',
        data: huileries.map((h) => h.huilerieNom),
        axisLabel: { interval: 0, rotate: 22 },
        axisLine: { lineStyle: { color: '#9aa4b2' } },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#e6eadf' } },
      },
      series: [
        {
          name: 'Utilisateurs',
          type: 'bar',
          data: huileries.map((h) => h.usersCount ?? 0),
          barMaxWidth: 44,
          itemStyle: { color: '#7e9440', borderRadius: [8, 8, 0, 0] },
        },
      ],
    };
  }

  private emptyLineOptions(title: string): any {
    return {
      title: { text: title, left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: [] },
      yAxis: { type: 'value' },
      series: [],
    };
  }

  private emptyPieOptions(title: string): any {
    return {
      title: { text: title, left: 'center' },
      tooltip: { trigger: 'item' },
      series: [],
    };
  }

  private emptyBarOptions(title: string): any {
    return {
      title: { text: title, left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: [] },
      yAxis: { type: 'value' },
      series: [],
    };
  }

  formatCount(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) {
      return '0';
    }

    return new Intl.NumberFormat('fr-FR').format(value);
  }

  formatQuantity(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) {
      return '0 t';
    }

    return `${new Intl.NumberFormat('fr-FR').format(value)} t`;
  }

  formatPercent(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) {
      return '0 %';
    }

    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value)} %`;
  }

  formatQuality(value: { extraVierge?: number; vierge?: number; lampante?: number } | null): string {
    if (!value) {
      return 'N/A';
    }

    const entries = [
      { label: 'Extra Vierge', count: value.extraVierge ?? 0 },
      { label: 'Vierge', count: value.vierge ?? 0 },
      { label: 'Lampante', count: value.lampante ?? 0 },
    ].sort((left, right) => right.count - left.count);

    return entries[0]?.label ?? 'N/A';
  }

  private toIsoDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
