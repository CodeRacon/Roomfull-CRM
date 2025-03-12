import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getFunctions, provideFunctions } from '@angular/fire/functions';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideFirebaseApp(() =>
      initializeApp({
        apiKey: 'AIzaSyBzoLtZSHNkEExAjPQQ_ck6a1KFSYbVE3o',
        authDomain: 'roomfull-crm.firebaseapp.com',
        projectId: 'roomfull-crm',
        storageBucket: 'roomfull-crm.firebasestorage.app',
        messagingSenderId: '58051527929',
        appId: '1:58051527929:web:f7ed20be8314c1e22a4e28',
      })
    ),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideFunctions(() => getFunctions()),
    provideAnimationsAsync(),
    provideAnimationsAsync(),
    provideAnimationsAsync(),
    provideAnimationsAsync(),
  ],
};
