import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { CampagneOlives } from '../../models/campagne.models';
import { CampagneService } from '../../services/campagne.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
    selector: 'app-campagnes-consulter',
    standalone: true,
    templateUrl: './campagnes-consulter.component.html',
    styleUrls: ['./campagnes-consulter.component.scss'],
    imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule],
})
export class CampagnesConsulterComponent implements OnInit {
    campagnes: CampagneOlives[] = [];
    selectedHuilerieNom = '';
    referenceFilter = '';

    constructor(
        private campagneService: CampagneService,
        private permissionService: PermissionService,
        private toastService: ToastService,
    ) { }

    get isAdmin(): boolean {
        return this.permissionService.isAdmin();
    }

    ngOnInit(): void {
        this.reload();
    }

    applyFilters(): void {
        this.reload();
        this.toastService.info('Filtres appliques.');
    }

    resetFilters(): void {
        this.selectedHuilerieNom = '';
        this.referenceFilter = '';
        this.reload();
        this.toastService.info('Filtres reinitialises.');
    }

    private reload(): void {
        const huilerieNom = this.isAdmin ? this.selectedHuilerieNom : undefined;
        this.campagneService.getAll(this.referenceFilter, huilerieNom).subscribe({
            next: (items) => {
                this.campagnes = items;
            },
            error: () => {
                this.campagnes = [];
                this.toastService.error('Impossible de charger les campagnes.');
            },
        });
    }
}
