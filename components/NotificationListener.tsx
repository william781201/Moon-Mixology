import React, { useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export const NotificationListener: React.FC = () => {
  useEffect(() => {
    let unsubscribeSnapshot: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }

      if (!user) return;

      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      const q = query(
        collection(db, 'users', user.uid, 'notifications'),
        where('read', '==', false)
      );

      unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const notification = change.doc.data();
            
            // Trigger Web Notification
            if ('Notification' in window && Notification.permission === 'granted') {
              const title = 'Mood Mixology - 新評價通知';
              const options = {
                body: `${notification.reviewerName} 評價了您的酒譜「${notification.recipeName}」(${notification.rating} 顆星)`,
                icon: '/favicon.ico', // Fallback icon
              };
              
              try {
                // Try to use service worker if available for better mobile support
                navigator.serviceWorker.ready.then((registration) => {
                  registration.showNotification(title, options);
                }).catch(() => {
                  // Fallback to standard notification
                  new Notification(title, options);
                });
              } catch (e) {
                new Notification(title, options);
              }
            }

            // Mark as read so we don't notify again
            updateDoc(doc(db, 'users', user.uid, 'notifications', change.doc.id), {
              read: true
            }).catch(console.error);
          }
        });
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  return null;
};
