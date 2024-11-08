import {  Component, inject, OnInit, signal, viewChild } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Location, NgClass } from '@angular/common';
import { getVersion } from '@tauri-apps/api/app';
import { Avatar, AvatarModule } from 'primeng/avatar';
import { TooltipModule } from 'primeng/tooltip';
import { DividerModule } from 'primeng/divider';
import { Store } from '@ngrx/store';
import { openUrl } from '../../lib/notecraftr-tauri';
import * as WindowState from '../../state/window';
import { Subscription } from 'rxjs';

@Component({
  selector: 'nc-about',
  standalone: true,
  imports: [ButtonModule, TooltipModule, NgClass, AvatarModule, DividerModule],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss'
})
export class AboutComponent implements OnInit {
  store = inject(Store);
  theme = this.store.selectSignal(WindowState.theme);
  locationService = inject(Location);
  currentYear = new Date().getFullYear();
  version = signal("");
  developerImgLink = signal<string | undefined>(undefined);
  devAvatar = viewChild.required<Avatar>(Avatar);
  devAvatarLabel = signal<string | undefined>(undefined);
  $devImgErr: Subscription | undefined;

  ngOnInit() {
    getVersion().then(v => this.version.set(v));
    this.developerImgLink.set("https://avatars.githubusercontent.com/u/73551111?v=4");
    this.$devImgErr = this.devAvatar().onImageError.subscribe(() => {
      this.devAvatarLabel.set("GP");
    })
  }

  onBackClick() {
    this.locationService.back()
  }

  openGitHub = () => {
    openUrl("https://github.com/mark7p/")
  }

  openYoutube = () => {
    openUrl("https://www.youtube.com/@mark.paniterce/")
  }

  openMicrosoftStore = () => {
    openUrl("https://www.microsoft.com/store/productId/9NTTN07T2PC2?ocid=pdpshare")
  }
  
  openChromeWebStore = () => {
    return;
    openUrl("https://www.youtube.com/@gen.paniterce/")
  }

}
