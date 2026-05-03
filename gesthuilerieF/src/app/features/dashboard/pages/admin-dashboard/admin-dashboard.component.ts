import { Component } from '@angular/core';
import { NbCardModule, NbIconModule, NbProgressBarModule, NbListModule } from '@nebular/theme';
import { NgFor } from '@angular/common';
import { NgxEchartsModule } from 'ngx-echarts';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
  standalone: true,
  imports: [
    NbCardModule,
    NbIconModule,
    NgFor,
    NgxEchartsModule,
    NbProgressBarModule,
    NbListModule,
  ],
})
export class AdminDashboardComponent {
  private readonly qualityLabelMap: Record<string, string> = {
    Excellente: 'Extra Vierge',
    Bonne: 'Vierge',
    Moyenne: 'Lampante',
  };

  kpis = [
    { label: 'Rendement moyen global', value: '19.8%', trend: '+1.4%', icon: 'trending-up-outline' },
    { label: 'Qualité lots conformes', value: '94%', trend: '+2.1%', icon: 'award-outline' },
    { label: 'Disponibilité machines', value: '91%', trend: '-0.6%', icon: 'settings-2-outline' },
    { label: 'Coût moyen / tonne', value: '1 230 MAD', trend: '-3.8%', icon: 'credit-card-outline' },
  ];

  huileries = [
    { name: 'Huilerie Atlas', prod: '128 t', rendement: '20.2%', qualite: 'Extra Vierge' },
    { name: 'Huilerie Rif', prod: '96 t', rendement: '18.9%', qualite: 'Vierge' },
    { name: 'Huilerie Saiss', prod: '84 t', rendement: '19.1%', qualite: 'Lampante' },
  ];

  machineHealth = [
    { name: 'Ligne Extraction A', value: 92 },
    { name: 'Décanteur D-04', value: 88 },
    { name: 'Centrifugeuse C-02', value: 79 },
    { name: 'Filtration F-03', value: 95 },
  ];

  activities = [
    'Nouvel utilisateur Responsable Production créé (Huilerie Atlas)',
    'Rôle qualité mis à jour avec privilège validation chimique',
    'Alerte maintenance préventive sur la machine C-02',
    'Rapport hebdomadaire exporté pour la direction',
  ];

  rendementTrendOptions: any = {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 30, bottom: 30 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
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
        data: [18.7, 19.2, 19.6, 20.1, 19.8, 20.4, 19.9],
        lineStyle: { color: '#7e9440', width: 3 },
        areaStyle: { color: 'rgba(126, 148, 64, 0.18)' },
        itemStyle: { color: '#7e9440' },
      },
    ],
  };

  qualityPieOptions: any = {
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
          { value: 54, name: 'Extra Vierge' },
          { value: 31, name: 'Vierge' },
          { value: 15, name: 'Lampante' },
        ],
      },
    ],
  };

  normalizeQualityLabel(value: string | null | undefined): string {
    const normalized = String(value ?? '').trim();
    return this.qualityLabelMap[normalized] ?? normalized;
  }
}
