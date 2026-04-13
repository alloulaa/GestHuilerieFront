import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NbButtonModule, NbCardModule, NbInputModule } from '@nebular/theme';
import { LotOlives } from '../../models/lot.models';
import { LotManagementService } from '../../services/lot-management.service';
import { PermissionService } from '../../../../core/services/permission.service';

@Component({
  selector: 'app-lot-list',
  templateUrl: './lot-list.component.html',
  styleUrls: ['./lot-list.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NbCardModule, NbButtonModule, NbInputModule],
})
export class LotListComponent implements OnInit {
  lots: LotOlives[] = [];
  selectedHuilerieNom = '';

  constructor(
    private lotManagementService: LotManagementService,
    private permissionService: PermissionService,
  ) { }

  get isAdmin(): boolean {
    return this.permissionService.isAdmin();
  }

  ngOnInit(): void {
    this.reloadLots();
    this.lotManagementService.lots$.subscribe(data => {
      this.lots = data;
    });
  }

  applyAdminHuilerieFilter(): void {
    this.reloadLots();
  }

  resetAdminHuilerieFilter(): void {
    this.selectedHuilerieNom = '';
    this.reloadLots();
  }

  private reloadLots(): void {
    const huilerieNom = this.isAdmin ? this.selectedHuilerieNom : undefined;
    this.lotManagementService.loadInitialData(huilerieNom).subscribe();
  }
}
