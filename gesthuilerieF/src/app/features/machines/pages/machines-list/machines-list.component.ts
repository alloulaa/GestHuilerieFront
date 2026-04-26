import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { Machine } from '../../models/enterprise.models';
import { MachineService } from '../../services/machine.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { MACHINE_TYPE_DATA, MachineTypeInfo } from '../../../../shared/constants/machine-type-data';

@Component({
  selector: 'app-machines-list',
  standalone: true,
  templateUrl: './machines-list.component.html',
  styleUrls: ['./machines-list.component.scss'],
  imports: [CommonModule, RouterModule, FormsModule, MatCardModule, MatButtonModule],
})
export class MachinesListComponent implements OnInit {
  machines: Machine[] = [];
  selectedHuilerieNom = '';
  aboutModalOpen = false;
  selectedTypeInfo: MachineTypeInfo | null = null;

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
    console.log('[machines-list] loadMachines called', { huilerieNom, isAdmin: this.isAdmin });
    this.machineService.getAll(huilerieNom).subscribe((data) => {
      console.log('[machines-list] received machines from service', { count: data.length, machines: data });
      this.machines = data;
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

  get enServiceCount(): number {
    return this.machines.filter((machine) => machine.etatMachine === 'EN_SERVICE').length;
  }

  get surveillanceCount(): number {
    return this.machines.filter((machine) => machine.etatMachine === 'SURVEILLANCE').length;
  }

  get maintenanceCount(): number {
    return this.machines.filter((machine) => machine.etatMachine === 'MAINTENANCE').length;
  }

  get desactiveeCount(): number {
    return this.machines.filter((machine) => machine.etatMachine === 'DESACTIVEE').length;
  }

  openAbout(typeMachine: string): void {
    this.selectedTypeInfo = MACHINE_TYPE_DATA[typeMachine] ?? null;
    this.aboutModalOpen = true;
  }

  closeAbout(): void {
    this.aboutModalOpen = false;
    this.selectedTypeInfo = null;
  }

  formatEtape(etape: string): string {
    return String(etape ?? '').replace(/^\s*\d+\.\s*/, '').trim();
  }
}
