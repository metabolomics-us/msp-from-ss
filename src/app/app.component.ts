import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    // eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection -- app is NgModule-based with mutable state read across change cycles; switching to OnPush needs its own verification pass
    changeDetection: ChangeDetectionStrategy.Eager,
    // eslint-disable-next-line @angular-eslint/prefer-standalone -- whole app is NgModule-based (AppModule/bootstrapModule); converting to standalone is a dedicated migration, not part of this ESLint setup task
    standalone: false
})
export class AppComponent {
  title = 'MSP Creator';
}
