import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { NbSidebarService, NbThemeService, NbButtonModule, NbIconModule, NbSelectModule, NbOptionModule, NbActionsModule, NbContextMenuModule, NbMenuService } from '@nebular/theme';
import { Subject, filter, takeUntil } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';

@Component({
    selector: 'ngx-header',
    styleUrls: ['./header.component.scss'],
    templateUrl: './header.component.html',
    standalone: true,
    imports: [
        NbButtonModule,
        NbIconModule,
        NbSelectModule,
        NbOptionModule,
        NbActionsModule,
        NbContextMenuModule,
    ],
})
export class HeaderComponent {
  currentTheme = 'default';
  userMenu = [{ title: 'Profile' }, { title: 'Log out' }];
  private destroy$ = new Subject<void>();

  constructor(
    private sidebarService: NbSidebarService,
    private themeService: NbThemeService,
    private menuService: NbMenuService,
    private authService: AuthService,
    private router: Router
  ) {
    this.menuService
      .onItemClick()
      .pipe(
        filter(({ tag }) => tag === 'user-menu'),
        takeUntil(this.destroy$)
      )
      .subscribe(({ item }) => {
        const action = (item?.title ?? '').toLowerCase();

        if (action === 'profile') {
          this.router.navigate(['/pages/mon-profil']);
          return;
        }

        if (action === 'log out') {
          this.authService.logout();
          this.router.navigate(['/login']);
        }
      });
  }

  toggleSidebar(): void {
    this.sidebarService.toggle(true, 'menu-sidebar');
  }

  changeTheme(themeName: string): void {
    this.currentTheme = themeName;
    this.themeService.changeTheme(themeName);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
