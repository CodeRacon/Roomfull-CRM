import { Injectable } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  user,
  User as FirebaseUser,
} from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { Observable, from, of, switchMap } from 'rxjs';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  user$: Observable<User | null>;

  constructor(private auth: Auth, private firestore: Firestore) {
    // transforming the firebase user into user-model
    this.user$ = user(this.auth).pipe(
      switchMap((firebaseUser: FirebaseUser | null) =>
        firebaseUser ? this.getUserData(firebaseUser) : of(null)
      )
    );
  }

  // Login with Email and Password
  login(email: string, password: string): Observable<any> {
    return from(signInWithEmailAndPassword(this.auth, email, password));
  }

  // registration of new user
  register(
    email: string,
    password: string,
    displayName: string
  ): Observable<any> {
    return from(
      createUserWithEmailAndPassword(this.auth, email, password).then(
        async (credentials) => {
          // create user-profile in Firestore
          const user: User = {
            uid: credentials.user.uid,
            email,
            displayName,
            role: 'customer', // standard role for new user
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          await setDoc(
            doc(this.firestore, 'users', credentials.user.uid),
            user
          );
          return credentials;
        }
      )
    );
  }

  // signout of user
  logout(): Observable<void> {
    return from(signOut(this.auth));
  }

  // gets the user-data from Firestore
  private getUserData(firebaseUser: FirebaseUser): Observable<User> {
    const userRef = doc(this.firestore, 'users', firebaseUser.uid);
    return from(
      getDoc(userRef).then((docSnap) => {
        if (docSnap.exists()) {
          return docSnap.data() as User;
        } else {
          // if there is no document yet, creeate a base-profil
          const newUser: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || '',
            photoURL: firebaseUser.photoURL || '',
            role: 'customer',
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          setDoc(userRef, newUser);
          return newUser;
        }
      })
    );
  }
  // helper-method to proof, whether user is admin
  isAdmin(user: User | null): boolean {
    return user?.role === 'admin';
  }
}
