import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { LotManagementService } from '../../../lots/services/lot-management.service';
import { ReceptionListComponent } from '../reception-list/reception-list.component';
import { PermissionService } from '../../../../core/services/permission.service';

@Component({
  selector: 'app-reception-new',
  standalone: true,
  templateUrl: './reception-new.component.html',
  styleUrls: ['./reception-new.component.scss'],
  imports: [CommonModule, RouterModule, MatCardModule, MatButtonModule],
})
export class ReceptionNewComponent extends ReceptionListComponent {
  constructor(
    lotManagementService: LotManagementService,
    permissionService: PermissionService,
  ) {
    super(lotManagementService, permissionService);
  }
}
