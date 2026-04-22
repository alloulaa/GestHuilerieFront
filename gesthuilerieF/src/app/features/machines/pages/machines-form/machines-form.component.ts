import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Machine } from '../../models/enterprise.models';
import { MachineService } from '../../services/machine.service';

@Component({
  selector: 'app-machines-form',
  standalone: true,
  templateUrl: './machines-form.component.html',
  styleUrls: ['./machines-form.component.scss'],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
})
export class MachinesFormComponent implements OnInit {
  machines: Machine[] = [];
  filteredMachines: Machine[] = [];

  readonly form;

  constructor(
    private machineService: MachineService,
    private formBuilder: FormBuilder,
  ) {
    this.form = this.formBuilder.group({
      etatMachine: ['ALL'],
      minCapacite: [''],
    });
  }

  ngOnInit(): void {
    this.machineService.getAll().subscribe((data) => {
      this.machines = data;

      this.applyFilter();
      this.form.valueChanges.subscribe(() => this.applyFilter());
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
    if (status === 'DESACTIVEE') {
      return 'Desactivee';
    }
    return status;
  }

  resetFilters(): void {
    this.form.reset({
      etatMachine: 'ALL',
      minCapacite: '',
    });
    this.applyFilter();
  }

  get totalMachinesCount(): number {
    return this.machines.length;
  }

  get filteredMachinesCount(): number {
    return this.filteredMachines.length;
  }

  applyFilter(): void {
    const raw = this.form.getRawValue();
    const minCapacite = raw.minCapacite ? Number(raw.minCapacite) : 0;

    this.filteredMachines = this.machines.filter((machine) => {
      const statusMatch = raw.etatMachine === 'ALL' || machine.etatMachine === raw.etatMachine;
      const capaciteMatch = machine.capacite >= minCapacite;

      return statusMatch && capaciteMatch;
    });
  }
}
