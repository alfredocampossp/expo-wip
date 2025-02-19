import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { auth, db } from '../src/services/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      if (!auth.currentUser) {
        setRedirectTo('/login');
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.isAdmin) {
            setRedirectTo('/admin');
          } else {
            setRedirectTo(userData.role === 'artist' ? '/home-artist' : '/home-contractor');
          }
        } else {
          setRedirectTo('/login');
        }
      } catch (error) {
        console.error('Error checking user:', error);
        setRedirectTo('/login');
      }
      setLoading(false);
    };

    checkUser();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (redirectTo) {
    return <Redirect href={redirectTo} />;
  }

  return null;
}
