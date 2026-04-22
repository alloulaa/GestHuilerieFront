import { Component, OnInit } from '@angular/core';
import { NbCardModule, NbProgressBarModule } from '@nebular/theme';
import { NgFor } from '@angular/common';
import { Machine } from '../../models/enterprise.models';
import { MachineService } from '../../services/machine.service';

@Component({
  selector: 'app-machine-state',
  templateUrl: './machine-state.component.html',
  styleUrls: ['./machine-state.component.scss'],
  standalone: true,
  imports: [
    NbCardModule,
    NgFor,
    NbProgressBarModule,
  ],
})
export class MachineStateComponent implements OnInit {
  machines: Array<Machine & { health: number; maintenance: string }> = [];

  constructor(private machineService: MachineService) { }

  ngOnInit(): void {
    this.machineService.getAll().subscribe((data) => {
      this.machines = data.map((machine) => ({
        ...machine,
        health: this.estimateHealth(machine.etatMachine),
        maintenance: '-',
      }));
    });
  }

  private estimateHealth(status: string): number {
    if (status === 'EN_SERVICE') {
      return 92;
    }
    if (status === 'SURVEILLANCE') {
      return 68;
    }
    if (status === 'DESACTIVEE') {
      return 0;
    }
    return 35;
  }

  getStatusLabel(status: string): string {
    if (status === 'EN_SERVICE') {
      return 'En service';
    }
    if (status === 'SURVEILLANCE') {
      return 'Surveillance';
    }
    if (status === 'MAINTENANCE') {
      return 'Maintenance planifiee';
    }
    if (status === 'DESACTIVEE') {
      return 'Desactivee';
    }
    return status;
  }

  getStatusClass(status: string): string {
    if (status === 'EN_SERVICE') {
      return 'ok';
    }
    if (status === 'SURVEILLANCE') {
      return 'warn';
    }
    return 'critical';
  }
}