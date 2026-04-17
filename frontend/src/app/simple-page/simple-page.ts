import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-simple-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './simple-page.html',
  styleUrls: ['./simple-page.scss'],
})
export class SimplePage {
  public title = 'Page';
  public description = 'Content goes here.';

  constructor(private route: ActivatedRoute) {
    const data = this.route.snapshot.data as { title?: string; description?: string };
    this.title = data.title || this.title;
    this.description = data.description || this.description;
  }
}
