import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { Machine } from '../../models/enterprise.models';
import { MachineService } from '../../services/machine.service';
import { PermissionService } from '../../../../core/services/permission.service';

@Component({
  selector: 'app-machines-list',
  standalone: true,
  templateUrl: './machines-list.component.html',
  styleUrls: ['./machines-list.component.scss'],
  imports: [CommonModule, RouterModule, FormsModule, MatCardModule, MatButtonModule],
})
export class MachinesListComponent implements OnInit {
  machines: Array<Machine & { availability: string }> = [];
  selectedHuilerieNom = '';

  constructor(
    private machineService: MachineService,
    private permissionService: PermissionService,
  ) { }

  get isAdmin(): boolean {
    return this.permissionService.isAdmin();
  }

  ngOnInit(): void {
    this.loadMachines();
  }

  applyAdminHuilerieFilter(): void {
    this.loadMachines();
  }

  resetAdminHuilerieFilter(): void {
    this.selectedHuilerieNom = '';
    this.loadMachines();
  }

  private loadMachines(): void {
    const huilerieNom = this.isAdmin ? this.selectedHuilerieNom : undefined;
    this.machineService.getAll(huilerieNom).subscribe((data) => {
      this.machines = data.map((item) => ({
        ...item,
        availability: item.etatMachine === 'MAINTENANCE' ? 'Indisponible' : 'Disponible',
      }));
    });
  }

  statusLabel(status: string): string {
    if (status === 'EN_SERVICE') {
      return 'En service';
    }
    if (status === 'SURVEILLANCE') {
      return 'Surveillance';
    }
    if (status === 'MAINTENANCE') {
      return 'Maintenance';
    }
    return status;
  }

  statusClass(status: string): string {
    if (status === 'EN_SERVICE') {
      return 'ok';
    }
    if (status === 'SURVEILLANCE') {
      return 'warn';
    }
    return 'critical';
  }

  availabilityClass(value: string): string {
    return value === 'Disponible' ? 'ok' : 'critical';
  }

  get enServiceCount(): number {
    return this.machines.filter((machine) => machine.etatMachine === 'EN_SERVICE').length;
  }

  get surveillanceCount(): number {
    return this.machines.filter((machine) => machine.etatMachine === 'SURVEILLANCE').length;
  }

  get maintenanceCount(): number {
    return this.machines.filter((machine) => machine.etatMachine === 'MAINTENANCE').length;
  }

  get availableCount(): number {
    return this.machines.filter((machine) => machine.availability === 'Disponible').length;
  }
}