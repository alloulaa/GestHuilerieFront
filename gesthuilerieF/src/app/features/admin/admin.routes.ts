// c:\Users\jendo\OneDrive\Bureau\GestHuilerieFront\gesthuilerieF\src\app\features\admin\admin.routes.ts
import { Routes } from '@angular/router';
import { SidebarComponent } from '../../@theme/components/sidebar/sidebar.component';
import { AuthGuard } from '../../core/auth/auth.guard';
import { RoleGuard } from '../../core/guards/role.guard';

import { ProfilsListComponent } from './profils/profils-list.component';
import { PermissionsEditorComponent } from './permissions/permissions-editor.component';
import { UtilisateursListComponent } from './utilisateurs/utilisateurs-list.component';

export const adminRoutes: Routes = [
  {
    path: '',
    component: SidebarComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { requiredProfil: 'ADMIN' },
    children: [
      { path: '', redirectTo: 'profils', pathMatch: 'full' },
      { path: 'profils', component: ProfilsListComponent },
      { path: 'permissions/:profilId', component: PermissionsEditorComponent },
      { path: 'utilisateurs', component: UtilisateursListComponent }
    ]
  }
];
