import { NgFor } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NbIconModule, NbSelectModule } from '@nebular/theme';
import { Huilerie } from '../../../machines/models/enterprise.models';

@Component({
    selector: 'app-huilerie-selector',
    standalone: true,
    imports: [NbSelectModule, NbIconModule, NgFor],
    templateUrl: './huilerie-selector.component.html',
    styleUrls: ['./huilerie-selector.component.scss'],
})
export class HuilerieSelectorComponent {
    @Input() options: Huilerie[] = [];
    @Input() selectedValue: number | 'all' = 'all';
    @Input() loading = false;
    @Input() label = 'Huilerie';

    @Output() selectedValueChange = new EventEmitter<number | 'all'>();

    onSelectionChange(value: number | 'all'): void {
        this.selectedValueChange.emit(value);
    }

    trackById(_: number, item: Huilerie): number {
        return item.idHuilerie;
    }
}