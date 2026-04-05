// c:\Users\jendo\OneDrive\Bureau\GestHuilerieFront\gesthuilerieF\src\app\shared\directives\has-permission.directive.ts
import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';

import { PermissionService } from '../../core/services/permission.service';

@Directive({ selector: '[appHasPermission]', standalone: true })
export class HasPermissionDirective {
  private hasView = false;

  constructor(
    private permissionService: PermissionService,
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef
  ) {}

  @Input() set appHasPermission(value: { module: string; action: string }) {
    const allowed = this.permissionService.hasPermission(
      value.module,
      value.action as 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXECUTE'
    );
    if (allowed && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!allowed && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}
