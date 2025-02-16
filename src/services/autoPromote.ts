import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import type { Event, User } from '../types';

export async function notifyMatchingArtists(event: Event) {
  try {
    // Get all artists that match event criteria
    const artistsQuery = query(
      collection(db, 'users'),
      where('role', '==', 'artist')
    );

    const artistsSnapshot = await getDocs(artistsQuery);

    for (const artistDoc of artistsSnapshot.docs) {
      const artist = artistDoc.data() as User;

      // Get artist profile
      const profileDoc = await getDocs(query(
        collection(db, 'artistProfiles'),
        where('userId', '==', artistDoc.id)
      ));

      if (!profileDoc.empty) {
        const profile = profileDoc.docs[0].data();
        const matchesGenres = event.styles.some(style => 
          profile.genres.includes(style)
        );
        const matchesCache = event.minCache >= profile.minimumCache;

        if (matchesGenres && matchesCache) {
          // For now, just log the notification
          console.log(`Would notify artist ${artist.email} about event ${event.title}`);
          
          // TODO: Implement actual push notifications
          // This would be the place to send push notifications
          // using a service like Firebase Cloud Messaging
        }
      }
    }
  } catch (error) {
    console.error('Error notifying artists:', error);
  }
}