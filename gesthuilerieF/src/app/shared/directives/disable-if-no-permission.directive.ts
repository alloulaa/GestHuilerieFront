// c:\Users\jendo\OneDrive\Bureau\GestHuilerieFront\gesthuilerieF\src\app\shared\directives\disable-if-no-permission.directive.ts
import { Directive, ElementRef, Input, Renderer2 } from '@angular/core';

import { PermissionService } from '../../core/services/permission.service';

@Directive({ selector: '[appDisableIfNoPermission]', standalone: true })
export class DisableIfNoPermissionDirective {
  constructor(
    private permissionService: PermissionService,
    private el: ElementRef,
    private renderer: Renderer2
  ) {}

  @Input() set appDisableIfNoPermission(value: { module: string; action: string }) {
    const allowed = this.permissionService.hasPermission(
      value.module,
      value.action as 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXECUTE'
    );
    if (!allowed) {
      this.renderer.setAttribute(this.el.nativeElement, 'disabled', 'true');
      this.renderer.setStyle(this.el.nativeElement, 'opacity', '0.5');
      this.renderer.setStyle(this.el.nativeElement, 'cursor', 'not-allowed');
    } else {
      this.renderer.removeAttribute(this.el.nativeElement, 'disabled');
      this.renderer.removeStyle(this.el.nativeElement, 'opacity');
      this.renderer.removeStyle(this.el.nativeElement, 'cursor');
    }
  }
}
